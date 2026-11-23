import logging
import random
import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Header, HTTPException, Response

from backend.app.models.schemas import (
    ClassCreateRequest,
    ClassResponse,
    ClassJoinRequest,
    ClassDetailResponse,
    StudentMember,
    StudentQuizHistoryItem,
    DailyActivityItem,
    ClassAnnouncementRequest,
)
from backend.app.services.supabase_client import (
    get_supabase_client,
    verify_token_and_get_user,
    local_db,
)
from backend.app.services.streak_service import get_ist_today

logger = logging.getLogger(__name__)

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
    """Teacher views detailed class dashboard: student list, analytics, and quiz completion status."""
    today_ist = str(get_ist_today())
    cls = local_db.classes.get(class_id)
    students_list = []
    completed_count = 0
    today_topic = "General Science"
    today_quiz_questions = []

    client = get_supabase_client()
    if client:
        try:
            if not cls:
                res = client.table("classes").select("*").eq("id", class_id).execute()
                if res.data:
                    cls = res.data[0]

            if cls:
                # 1. Fetch user emails from auth
                email_map = {}
                try:
                    auth_users = client.auth.admin.list_users()
                    email_map = {u.id: u.email for u in auth_users}
                except Exception:
                    pass

                # 2. Fetch enrolled members with profiles
                m_res = client.table("class_members").select("user_id, joined_at, profiles(display_name)").eq("class_id", class_id).execute()
                
                # 3. Fetch all quiz attempts for this class
                att_res = client.table("quiz_attempts").select("*").eq("class_id", class_id).order("created_at", desc=True).execute()
                all_attempts = att_res.data or []

                attempts_by_user = defaultdict(list)
                for a in all_attempts:
                    attempts_by_user[a["user_id"]].append(a)

                total_accuracy_sum = 0.0
                accuracy_sample_count = 0

                for m in (m_res.data or []):
                    uid = m["user_id"]
                    profile_info = m.get("profiles") or {}
                    dname = profile_info.get("display_name") or f"Student {uid[:4]}"
                    u_email = email_map.get(uid)

                    user_attempts = attempts_by_user.get(uid, [])
                    u_points = sum(a.get("points", 0) for a in user_attempts)
                    u_completed_count = len(user_attempts)
                    u_acc = (
                        round(sum(a.get("accuracy", 0.0) for a in user_attempts) / u_completed_count, 1)
                        if u_completed_count > 0 else 0.0
                    )
                    if u_completed_count > 0:
                        total_accuracy_sum += u_acc
                        accuracy_sample_count += 1

                    # Check today's attempt
                    today_att = next(
                        (a for a in user_attempts if str(a.get("created_at", "")).startswith(today_ist)),
                        None
                    )
                    completed = bool(today_att)
                    if completed:
                        completed_count += 1

                    # History items
                    history_items = [
                        StudentQuizHistoryItem(
                            quiz_id=a.get("quiz_id", ""),
                            score=a.get("score", 0),
                            total=a.get("total", 5),
                            points=a.get("points", 0),
                            accuracy=a.get("accuracy", 0.0),
                            created_at=str(a.get("created_at", ""))
                        )
                        for a in user_attempts
                    ]

                    students_list.append(StudentMember(
                        user_id=uid,
                        display_name=dname,
                        email=u_email,
                        joined_at=str(m.get("joined_at", "")),
                        completed_today=completed,
                        today_score=today_att.get("score") if today_att else None,
                        total_points=u_points,
                        accuracy=u_acc,
                        quizzes_completed=u_completed_count,
                        history=history_items
                    ))

                # 4. Fetch today's quiz topic & questions
                q_res = client.table("daily_quizzes").select("topic, questions_json").eq("class_id", class_id).eq("quiz_date", today_ist).execute()
                if q_res.data:
                    today_topic = q_res.data[0].get("topic", "General Science")
                    today_quiz_questions = q_res.data[0].get("questions_json", [])

                class_avg_acc = (
                    round(total_accuracy_sum / accuracy_sample_count, 1)
                    if accuracy_sample_count > 0 else 0.0
                )

                # 5. Fetch class noticeboard announcement (stored with quiz_date = '1970-01-01')
                announcement_text = None
                announcement_time = None
                try:
                    ann_res = client.table("daily_quizzes").select("questions_json").eq("class_id", class_id).eq("quiz_date", "1970-01-01").execute()
                    if ann_res.data and ann_res.data[0].get("questions_json"):
                        ann_items = ann_res.data[0]["questions_json"]
                        if isinstance(ann_items, list) and len(ann_items) > 0:
                            announcement_text = ann_items[0].get("announcement")
                            announcement_time = ann_items[0].get("updated_at")
                except Exception:
                    pass

                # 6. Compute 14-day Activity Heatmap
                total_enrolled = len(m_res.data or [])
                today_date_obj = get_ist_today()
                dates_map = {}
                for i in range(13, -1, -1):
                    d_str = str(today_date_obj - timedelta(days=i))
                    dates_map[d_str] = set()

                for a in all_attempts:
                    d_str = str(a.get("created_at", ""))[:10]
                    if d_str in dates_map:
                        dates_map[d_str].add(a.get("user_id"))

                heatmap_list = []
                day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
                for d_str, uids in dates_map.items():
                    d_obj = datetime.strptime(d_str, "%Y-%m-%d")
                    day_name = day_names[d_obj.weekday()]
                    cnt = len(uids)
                    pct = round((cnt / total_enrolled * 100), 1) if total_enrolled > 0 else 0.0
                    heatmap_list.append(DailyActivityItem(
                        date=d_str,
                        day_name=day_name,
                        completed_count=cnt,
                        total_students=total_enrolled,
                        percentage=pct
                    ))

                return ClassDetailResponse(
                    id=cls["id"],
                    name=cls["name"],
                    join_code=cls["join_code"],
                    teacher_id=cls["teacher_id"],
                    created_at=str(cls.get("created_at", "")),
                    students=students_list,
                    today_quiz_topic=today_topic,
                    today_quiz_completed_count=completed_count,
                    today_quiz_questions=today_quiz_questions,
                    average_accuracy=class_avg_acc,
                    announcement=announcement_text,
                    announcement_updated_at=announcement_time,
                    activity_heatmap=heatmap_list
                )
        except Exception as e:
            logger.warning(f"Error getting class details from Supabase: {e}")

    # Fallback to local_db
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")

    members = [m for m in local_db.class_members if m["class_id"] == class_id]
    for m in members:
        uid = m["user_id"]
        profile = local_db.profiles.get(uid, {"display_name": f"Student {uid[:4]}"})
        u_attempts = [a for a in local_db.quiz_attempts if a["class_id"] == class_id and a["user_id"] == uid]
        today_att = next(
            (a for a in u_attempts if str(a.get("created_at", "")).startswith(today_ist)),
            None
        )
        completed = bool(today_att)
        if completed:
            completed_count += 1

        u_points = sum(a.get("points", 0) for a in u_attempts)
        u_count = len(u_attempts)
        u_acc = round(sum(a.get("accuracy", 0.0) for a in u_attempts) / u_count, 1) if u_count else 0.0

        students_list.append(StudentMember(
            user_id=uid,
            display_name=profile.get("display_name", f"Student {uid[:4]}"),
            email=profile.get("email"),
            joined_at=m.get("joined_at", ""),
            completed_today=completed,
            today_score=today_att.get("score") if today_att else None,
            total_points=u_points,
            accuracy=u_acc,
            quizzes_completed=u_count,
            history=[
                StudentQuizHistoryItem(
                    quiz_id=a.get("quiz_id", ""),
                    score=a.get("score", 0),
                    total=a.get("total", 5),
                    points=a.get("points", 0),
                    accuracy=a.get("accuracy", 0.0),
                    created_at=str(a.get("created_at", ""))
                ) for a in u_attempts
            ]
        ))

    today_topic = local_db.daily_quizzes.get(f"{class_id}_{today_ist}", {}).get("topic", "Water Cycle")
    local_quiz = local_db.daily_quizzes.get(f"{class_id}_{today_ist}", {})
    today_quiz_questions = local_quiz.get("questions_json", [])
    local_ann = local_db.announcements.get(class_id, {})

    total_enrolled = len(members)
    today_date_obj = get_ist_today()
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    fallback_heatmap = [
        DailyActivityItem(
            date=str(today_date_obj - timedelta(days=i)),
            day_name=day_names[(today_date_obj - timedelta(days=i)).weekday()],
            completed_count=completed_count if i == 0 else 0,
            total_students=total_enrolled,
            percentage=round(completed_count / total_enrolled * 100, 1) if (i == 0 and total_enrolled > 0) else 0.0
        )
        for i in range(13, -1, -1)
    ]

    return ClassDetailResponse(
        id=cls["id"],
        name=cls["name"],
        join_code=cls["join_code"],
        teacher_id=cls["teacher_id"],
        created_at=cls.get("created_at", ""),
        students=students_list,
        today_quiz_topic=today_topic,
        today_quiz_completed_count=completed_count,
        today_quiz_questions=today_quiz_questions,
        average_accuracy=0.0,
        announcement=local_ann.get("announcement"),
        announcement_updated_at=local_ann.get("updated_at"),
        activity_heatmap=fallback_heatmap
    )

@router.post("/{class_id}/announcement")
def set_class_announcement(
    class_id: str,
    req: ClassAnnouncementRequest,
    authorization: Optional[str] = Header(None)
):
    """Teacher posts or updates the class noticeboard announcement."""
    client = get_supabase_client()
    now_iso = datetime.utcnow().isoformat()
    clean_text = req.announcement.strip()

    if client:
        try:
            client.table("daily_quizzes").upsert({
                "class_id": class_id,
                "quiz_date": "1970-01-01",
                "topic": "CLASS_ANNOUNCEMENT",
                "questions_json": [{"announcement": clean_text, "updated_at": now_iso}]
            }, on_conflict="class_id,quiz_date").execute()
        except Exception as e:
            logger.warning(f"Error saving announcement to Supabase: {e}")

    local_db.announcements[class_id] = {"announcement": clean_text, "updated_at": now_iso}
    return {"message": "Announcement posted successfully! 📢", "announcement": clean_text, "updated_at": now_iso}

@router.delete("/{class_id}/announcement")
def clear_class_announcement(class_id: str, authorization: Optional[str] = Header(None)):
    """Teacher clears the class noticeboard announcement."""
    client = get_supabase_client()
    if client:
        try:
            client.table("daily_quizzes").delete().eq("class_id", class_id).eq("quiz_date", "1970-01-01").execute()
        except Exception:
            pass

    local_db.announcements.pop(class_id, None)
    return {"message": "Announcement cleared."}

@router.get("/{class_id}/export-csv")
def export_class_csv(class_id: str, authorization: Optional[str] = Header(None)):
    """Exports class roster and student analytics as a downloadable CSV."""
    details = get_class_details(class_id, authorization)
    
    rows = ["Nickname,Email,Joined Date,Today Status,Today Score,Total Points,Quizzes Completed,Overall Accuracy %"]
    for s in details.students:
        status_text = "Completed" if s.completed_today else "Pending"
        today_score_text = f"{s.today_score}/5" if s.today_score is not None else "N/A"
        clean_email = s.email or "N/A"
        clean_name = f'"{s.display_name}"'
        rows.append(f"{clean_name},{clean_email},{s.joined_at[:10]},{status_text},{today_score_text},{s.total_points},{s.quizzes_completed},{s.accuracy}%")

    csv_data = "\n".join(rows)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="class_{details.name.replace(" ", "_")}_report.csv"'}
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

@router.delete("/{class_id}")
def delete_class_endpoint(class_id: str, authorization: Optional[str] = Header(None)):
    """Teacher permanently deletes a class and its associated data."""
    user = get_current_user_or_default(authorization)
    uid = user["id"]

    client = get_supabase_client()
    if client:
        try:
            res = client.table("classes").select("id, name, teacher_id").eq("id", class_id).execute()
            if not res.data:
                raise HTTPException(status_code=404, detail="Class not found")
            cls = res.data[0]
            if cls["teacher_id"] != uid and user.get("role") != "teacher":
                raise HTTPException(status_code=403, detail="Only the teacher of this class can delete it.")

            client.table("classes").delete().eq("id", class_id).execute()
            return {"message": f"Class '{cls['name']}' deleted successfully"}
        except HTTPException:
            raise
        except Exception as e:
            logger.warning(f"Error deleting class from Supabase: {e}")

    # Local fallback
    if class_id in local_db.classes:
        name = local_db.classes[class_id].get("name", "Class")
        del local_db.classes[class_id]
        local_db.class_members = [m for m in local_db.class_members if m["class_id"] != class_id]
        local_db.quiz_attempts = [a for a in local_db.quiz_attempts if a["class_id"] != class_id]
        return {"message": f"Class '{name}' deleted successfully"}

    raise HTTPException(status_code=404, detail="Class not found")
