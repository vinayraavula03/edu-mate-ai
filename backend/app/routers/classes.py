import random
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Header, HTTPException

from backend.app.models.schemas import (
    ClassCreateRequest,
    ClassResponse,
    ClassJoinRequest,
    ClassDetailResponse,
    StudentMember,
)
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)
from backend.app.services.streak_service import get_ist_today

router = APIRouter(prefix="/classes", tags=["Classes"])

def generate_join_code(length: int = 6) -> str:
    """Generate human-friendly uppercase alphanumeric join code."""
    chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(random.choice(chars) for _ in range(length))

def get_current_user_or_default(authorization: Optional[str]) -> dict:
    user = verify_token_and_get_user(authorization)
    if user:
        return user
    # Fallback to demo student or teacher
    return {"id": "demo-student-id", "email": "student@edumate.com", "role": "student"}

@router.post("", response_model=ClassResponse)
def create_class(req: ClassCreateRequest, authorization: Optional[str] = Header(None)):
    """Teacher creates a class with an auto-generated unique join code."""
    user = get_current_user_or_default(authorization)
    teacher_id = user["id"]
    join_code = generate_join_code()
    class_id = str(uuid.uuid4())
    now_iso = datetime.utcnow().isoformat()

    client = get_supabase_client()
    if client:
        try:
            res = client.table("classes").insert({
                "id": class_id,
                "name": req.name.strip(),
                "join_code": join_code,
                "teacher_id": teacher_id
            }).execute()
            if res.data:
                c = res.data[0]
                return ClassResponse(
                    id=c["id"],
                    name=c["name"],
                    join_code=c["join_code"],
                    teacher_id=c["teacher_id"],
                    created_at=c.get("created_at", now_iso),
                    student_count=0
                )
        except Exception:
            pass

    # Local fallback
    local_db.classes[class_id] = {
        "id": class_id,
        "name": req.name.strip(),
        "join_code": join_code,
        "teacher_id": teacher_id,
        "created_at": now_iso
    }
    return ClassResponse(
        id=class_id,
        name=req.name.strip(),
        join_code=join_code,
        teacher_id=teacher_id,
        created_at=now_iso,
        student_count=0
    )

@router.post("/join")
def join_class(req: ClassJoinRequest, authorization: Optional[str] = Header(None)):
    """Student joins a class by entering the 6-character join code."""
    user = get_current_user_or_default(authorization)
    student_id = user["id"]
    code = req.join_code.strip().upper()

    client = get_supabase_client()
    if client:
        try:
            class_res = client.table("classes").select("*").eq("join_code", code).execute()
            if not class_res.data:
                raise HTTPException(status_code=404, detail="Invalid join code. Please check with your teacher!")

            cls = class_res.data[0]
            class_id = cls["id"]

            # Check if already joined
            member_res = client.table("class_members").select("*").eq("class_id", class_id).eq("user_id", student_id).execute()
            if not member_res.data:
                client.table("class_members").insert({
                    "class_id": class_id,
                    "user_id": student_id
                }).execute()

            return {
                "message": f"Successfully joined {cls['name']}! 🎉",
                "class_id": class_id,
                "class_name": cls["name"]
            }
        except HTTPException:
            raise
        except Exception:
            pass

    # Local fallback
    found_class = None
    for c in local_db.classes.values():
        if c.get("join_code") == code:
            found_class = c
            break

    if not found_class:
        raise HTTPException(status_code=404, detail="Invalid join code. Please check with your teacher!")

    class_id = found_class["id"]
    already_member = any(
        m["class_id"] == class_id and m["user_id"] == student_id
        for m in local_db.class_members
    )
    if not already_member:
        local_db.class_members.append({
            "id": str(uuid.uuid4()),
            "class_id": class_id,
            "user_id": student_id,
            "joined_at": datetime.utcnow().isoformat()
        })

    return {
        "message": f"Successfully joined {found_class['name']}! 🎉",
        "class_id": class_id,
        "class_name": found_class["name"]
    }

@router.get("/my")
def get_my_classes(authorization: Optional[str] = Header(None)):
    """
    Returns classes for current user.
    - If teacher: returns classes created by teacher.
    - If student: returns class the student is enrolled in.
    """
    user = get_current_user_or_default(authorization)
    uid = user["id"]

    client = get_supabase_client()
    if client:
        try:
            # Check teacher classes
            t_classes = client.table("classes").select("*").eq("teacher_id", uid).execute()
            if t_classes.data:
                result = []
                for c in t_classes.data:
                    m_count = client.table("class_members").select("id", count="exact").eq("class_id", c["id"]).execute()
                    count = m_count.count or 0
                    result.append(ClassResponse(
                        id=c["id"],
                        name=c["name"],
                        join_code=c["join_code"],
                        teacher_id=c["teacher_id"],
                        created_at=c.get("created_at", ""),
                        student_count=count
                    ))
                return {"role": "teacher", "classes": result}

            # Check student enrollment
            s_memberships = client.table("class_members").select("class_id, classes(*)").eq("user_id", uid).execute()
            if s_memberships.data:
                classes = []
                for item in s_memberships.data:
                    c = item.get("classes")
                    if c:
                        classes.append(ClassResponse(
                            id=c["id"],
                            name=c["name"],
                            join_code=c["join_code"],
                            teacher_id=c["teacher_id"],
                            created_at=c.get("created_at", ""),
                            student_count=0
                        ))
                return {"role": "student", "classes": classes}
        except Exception:
            pass

    # Local fallback
    t_classes = [c for c in local_db.classes.values() if c["teacher_id"] == uid]
    if t_classes:
        return {
            "role": "teacher",
            "classes": [
                ClassResponse(
                    id=c["id"],
                    name=c["name"],
                    join_code=c["join_code"],
                    teacher_id=c["teacher_id"],
                    created_at=c.get("created_at", ""),
                    student_count=sum(1 for m in local_db.class_members if m["class_id"] == c["id"])
                ) for c in t_classes
            ]
        }

    s_class_ids = [m["class_id"] for m in local_db.class_members if m["user_id"] == uid]
    student_classes = [local_db.classes[cid] for cid in s_class_ids if cid in local_db.classes]
    return {
        "role": "student",
        "classes": [
            ClassResponse(
                id=c["id"],
                name=c["name"],
                join_code=c["join_code"],
                teacher_id=c["teacher_id"],
                created_at=c.get("created_at", ""),
                student_count=sum(1 for m in local_db.class_members if m["class_id"] == c["id"])
            ) for c in student_classes
        ]
    }

@router.get("/{class_id}", response_model=ClassDetailResponse)
def get_class_details(class_id: str, authorization: Optional[str] = Header(None)):
    """Teacher views detailed class dashboard: student list and quiz completion status."""
    today_ist = str(get_ist_today())
    cls = local_db.classes.get(class_id)
    if not cls:
        # Check supabase
        client = get_supabase_client()
        if client:
            try:
                res = client.table("classes").select("*").eq("id", class_id).execute()
                if res.data:
                    cls = res.data[0]
            except Exception:
                pass

    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    # Get enrolled students and whether they completed today's quiz
    students_list = []
    completed_count = 0
    members = [m for m in local_db.class_members if m["class_id"] == class_id]

    for m in members:
        uid = m["user_id"]
        profile = local_db.profiles.get(uid, {"display_name": f"Student {uid[:4]}"})
        
        # Check today's attempt
        today_att = next(
            (a for a in local_db.quiz_attempts 
             if a["class_id"] == class_id and a["user_id"] == uid and str(a.get("created_at", "")).startswith(today_ist)),
            None
        )
        completed = bool(today_att)
        if completed:
            completed_count += 1

        students_list.append(StudentMember(
            user_id=uid,
            display_name=profile.get("display_name", f"Student {uid[:4]}"),
            joined_at=m.get("joined_at", ""),
            completed_today=completed,
            today_score=today_att.get("score") if today_att else None
        ))

    today_topic = local_db.daily_quizzes.get(f"{class_id}_{today_ist}", {}).get("topic", "Water Cycle")

    return ClassDetailResponse(
        id=cls["id"],
        name=cls["name"],
        join_code=cls["join_code"],
        teacher_id=cls["teacher_id"],
        created_at=cls.get("created_at", ""),
        students=students_list,
        today_quiz_topic=today_topic,
        today_quiz_completed_count=completed_count
    )

@router.post("/{class_id}/regenerate-code")
def regenerate_join_code_endpoint(class_id: str, authorization: Optional[str] = Header(None)):
    """Teacher regenerates the join code."""
    new_code = generate_join_code()

    client = get_supabase_client()
    if client:
        try:
            client.table("classes").update({"join_code": new_code}).eq("id", class_id).execute()
        except Exception:
            pass

    if class_id in local_db.classes:
        local_db.classes[class_id]["join_code"] = new_code

    return {"class_id": class_id, "new_join_code": new_code}

@router.delete("/{class_id}/students/{user_id}")
def remove_student_from_class(class_id: str, user_id: str, authorization: Optional[str] = Header(None)):
    """Teacher removes an enrolled student from the class."""
    client = get_supabase_client()
    if client:
        try:
            client.table("class_members").delete().eq("class_id", class_id).eq("user_id", user_id).execute()
        except Exception:
            pass

    local_db.class_members = [
        m for m in local_db.class_members
        if not (m["class_id"] == class_id and m["user_id"] == user_id)
    ]
    return {"message": "Student removed successfully"}
