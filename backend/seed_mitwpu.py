import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.profile import Profile, Skill, UserSkill
from app.models.connection import Connection, ConnectionRequest, RequestStatus
from app.models.post import Post, Like, Comment
from app.models.community import Community, CommunityMember, CommunityPost, ApprovalStatus
from app.models.event import Event, EventRegistration, RegistrationStatus, EventStatus
from app.models.collaboration import Collaboration, Application, CollaborationStatus, ApplicationStatus
from app.models.search import SearchHistory
from app.models.notification import Notification, NotificationType, ReferenceType, NotificationPreference
from app.models.resource import Resource, ResourceDownload, ResourceType
from app.models.chat import Conversation, ConversationParticipant, Message, MessageRead, ConversationType
from app.utils.hashing import hash_password


def seed_mitwpu_data():
    db: Session = SessionLocal()

    try:
        print("1. Selective cleanup of dynamic data...")
        # Clear child / junction tables first to respect foreign keys
        db.query(ResourceDownload).delete()
        db.query(Resource).delete()
        db.query(MessageRead).delete()
        db.query(Message).delete()
        db.query(ConversationParticipant).delete()
        db.query(Conversation).delete()
        db.query(SearchHistory).delete()
        db.query(Notification).delete()
        db.query(NotificationPreference).delete()
        db.query(Application).delete()
        db.query(Collaboration).delete()
        db.query(EventRegistration).delete()
        db.query(Event).delete()
        db.query(CommunityMember).delete()
        db.query(CommunityPost).delete()
        db.query(Community).delete()
        db.query(Like).delete()
        db.query(Comment).delete()
        db.query(Post).delete()
        db.query(Connection).delete()
        db.query(ConnectionRequest).delete()
        db.query(UserSkill).delete()
        db.query(Skill).delete()
        db.commit()

        # Preserve the core 4 accounts and delete other test profiles/users
        other_profiles = db.query(Profile).filter(~Profile.user_id.in_([1, 2, 3, 4]))
        for p in other_profiles:
            db.delete(p)
        db.commit()

        db.query(User).filter(~User.user_id.in_([1, 2, 3, 4])).delete(synchronize_session=False)
        db.commit()

        print("2. Ensuring core users exist, have profiles and preferences...")
        prapti = db.query(User).filter(User.user_id == 1).first()
        rujuta = db.query(User).filter(User.user_id == 2).first()
        swapnil = db.query(User).filter(User.user_id == 3).first()
        council = db.query(User).filter(User.user_id == 4).first()

        if not prapti:
            prapti = User(user_id=1, name="Prapti Dodal", email="prapti@gmail.com", password_hash=hash_password("password123"), role=UserRole.student.value)
            db.add(prapti)
        else:
            prapti.password_hash = hash_password("password123")
            prapti.role = UserRole.student.value

        if not rujuta:
            rujuta = User(user_id=2, name="Rujuta Dani", email="rujuta@gmail.com", password_hash=hash_password("password123"), role=UserRole.student.value)
            db.add(rujuta)
        else:
            rujuta.password_hash = hash_password("password123")
            rujuta.role = UserRole.student.value

        if not swapnil:
            swapnil = User(user_id=3, name="Swapnil Goje", email="sg@gmail.com", password_hash=hash_password("password123"), role=UserRole.faculty.value)
            db.add(swapnil)
        else:
            swapnil.password_hash = hash_password("password123")
            swapnil.role = UserRole.faculty.value

        if not council:
            council = User(user_id=4, name="Student Council", email="council.org@gmail.com", password_hash=hash_password("password123"), role=UserRole.admin.value)
            db.add(council)
        else:
            council.password_hash = hash_password("password123")
            council.role = UserRole.admin.value
        db.commit()

        # Update profiles for core users
        p_prapti = db.query(Profile).filter(Profile.user_id == 1).first()
        if not p_prapti:
            p_prapti = Profile(user_id=1)
            db.add(p_prapti)
        p_prapti.bio = "Computer Science student at MIT-WPU Pune. UI/UX design enthusiast, front-end developer, and Hackathon organizer."
        p_prapti.department = "Computer Science"
        p_prapti.year_of_study = "3rd"
        p_prapti.profile_picture = "/static/avatars/prapti.jpg"

        p_rujuta = db.query(Profile).filter(Profile.user_id == 2).first()
        if not p_rujuta:
            p_rujuta = Profile(user_id=2)
            db.add(p_rujuta)
        p_rujuta.bio = "Machine Learning researcher and Cloud Architect. Coding in Python and React at MIT-WPU Pune. Always down to discuss system design."
        p_rujuta.department = "Computer Science"
        p_rujuta.year_of_study = "3rd"
        p_rujuta.profile_picture = "/static/avatars/rujuta.jpg"

        p_swapnil = db.query(Profile).filter(Profile.user_id == 3).first()
        if not p_swapnil:
            p_swapnil = Profile(user_id=3)
            db.add(p_swapnil)
        p_swapnil.bio = "Assistant Professor, School of Computer Engineering, MIT-WPU Pune. Mentoring Capstone projects and hackathon teams."
        p_swapnil.designation = "Assistant Professor"
        p_swapnil.department = "Computer Science"
        p_swapnil.profile_picture = "/static/avatars/swapnil.jpg"

        p_council = db.query(Profile).filter(Profile.user_id == 4).first()
        if not p_council:
            p_council = Profile(user_id=4)
            db.add(p_council)
        p_council.bio = "Official Student Council Hub of Dr. Vishwanath Karad MIT World Peace University, Pune. Coordinating cultural, technical, and sports events."
        p_council.designation = "Student Council Hub"
        p_council.profile_picture = None
        db.commit()

        for u_id in [1, 2, 3, 4]:
            db.add(NotificationPreference(user_id=u_id))
        db.commit()

        print("3. Seeding extended MIT-WPU campus users...")
        u_aarav = User(name="Aarav Sharma", email="aarav.sharma@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_riya = User(name="Riya Deshmukh", email="riya.deshmukh@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_aditya = User(name="Aditya Joshi", email="aditya.joshi@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_rohan = User(name="Rohan Patil", email="rohan.patil@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_sneha = User(name="Sneha Kulkarni", email="sneha.kulkarni@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_tanmay = User(name="Tanmay Gokhale", email="tanmay.gokhale@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_devendra = User(name="Devendra Ranade", email="devendra.ranade@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        u_shreya = User(name="Shreya Shinde", email="shreya.shinde@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.student.value)
        
        u_rajesh = User(name="Dr. Rajesh Kulkarni", email="rajesh.kulkarni@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.faculty.value)
        u_amita = User(name="Dr. Amita Patel", email="amita.patel@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.faculty.value)
        
        u_acm = User(name="MIT-WPU ACM Student Chapter", email="acm.chapter@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.club.value)
        u_robotics = User(name="MIT-WPU Robotics Club", email="robotics.club@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.club.value)
        u_aarohan_club = User(name="WPU Aarohan Drama Club", email="drama.club@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.club.value)
        u_baja = User(name="WPU BAJA Racing Team", email="baja.racing@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.club.value)
        u_texephyr = User(name="WPU Texephyr Committee", email="texephyr@mitwpu.edu.in", password_hash=hash_password("password123"), role=UserRole.club.value)
        
        new_users = [
            u_aarav, u_riya, u_aditya, u_rohan, u_sneha, u_tanmay, u_devendra, u_shreya,
            u_rajesh, u_amita, u_acm, u_robotics, u_aarohan_club, u_baja, u_texephyr
        ]
        
        for u in new_users:
            db.add(u)
        db.commit()

        # Add profiles for new users
        db.add(Profile(user_id=u_aarav.user_id, bio="Full-stack developer at MIT-WPU Pune. Building React web apps. Smart India Hackathon lead.", department="Computer Science", year_of_study="3rd", profile_picture="/static/avatars/aarav.jpg"))
        db.add(Profile(user_id=u_riya.user_id, bio="Designing electric vehicle chassis and drivetrains. BAJA SAE participant representing MIT-WPU Pune. CAD/SolidWorks geek.", department="Mechanical Engineering", year_of_study="4th", profile_picture="/static/avatars/riya.jpg"))
        db.add(Profile(user_id=u_aditya.user_id, bio="M.Tech Data Science student. Exploring Deep Learning, PyTorch, SQL, and database performance tuning.", department="Data Science", year_of_study="1st", profile_picture="/static/avatars/aditya.jpg"))
        db.add(Profile(user_id=u_rohan.user_id, bio="Robotics enthusiast. Building micro-controller nodes and ROS layouts. Electronics & Communication student.", department="Electronics Engineering", year_of_study="2nd", profile_picture="/static/avatars/rohan.jpg"))
        db.add(Profile(user_id=u_sneha.user_id, bio="Flutter enthusiast and mobile UI builder. Third year B.Tech. Love organizing events and technical workshops.", department="Computer Science", year_of_study="3rd", profile_picture="/static/avatars/sneha.jpg"))
        db.add(Profile(user_id=u_tanmay.user_id, bio="School of Design student at MIT-WPU. Figma expert, illustrator, and digital painter. Open to UX collab projects.", department="Design", year_of_study="3rd", profile_picture="/static/avatars/tanmay.jpg"))
        db.add(Profile(user_id=u_devendra.user_id, bio="Senior CSE student. Leetcode 2000+. Backend scaling, Linux, Docker, and Kubernetes enthusiast.", department="Computer Science", year_of_study="4th", profile_picture="/static/avatars/devendra.jpg"))
        db.add(Profile(user_id=u_shreya.user_id, bio="MBA student in Operations. Organizing corporate relations and corporate panels at MIT-WPU Pune.", department="School of Management", year_of_study="2nd", profile_picture="/static/avatars/shreya.jpg"))
        
        db.add(Profile(user_id=u_rajesh.user_id, bio="Professor & HOD of Computer Engineering, School of CSE, MIT World Peace University Pune. Academic Researcher.", designation="Professor & HOD", department="Computer Science", profile_picture="/static/avatars/rajesh.jpg"))
        db.add(Profile(user_id=u_amita.user_id, bio="Associate Professor, School of Mechanical Engineering, MIT-WPU. Specializing in Finite Element Analysis and CAD simulations.", designation="Associate Professor", department="Mechanical Engineering", profile_picture="/static/avatars/amita.jpg"))
        
        db.add(Profile(user_id=u_acm.user_id, bio="Association for Computing Machinery Student Chapter, MIT-WPU Pune. Hosting bootcamps, code contests, and hackathons.", designation="Official Technical Chapter"))
        db.add(Profile(user_id=u_robotics.user_id, bio="Robotics and Robocon Development Cell of Dr. Vishwanath Karad MIT World Peace University Pune. Team Robocon.", designation="Robotics Development Cell"))
        db.add(Profile(user_id=u_aarohan_club.user_id, bio="WPU Aarohan Dramatics Society. Representing MIT-WPU in Firodiya, Purushottam, and Symbiosis fests.", designation="Cultural Drama Hub"))
        db.add(Profile(user_id=u_baja.user_id, bio="Official SAE BAJA Racing Team of MIT-WPU. Fabricating electric go-karts and single-seater ATVs.", designation="Automotive Cell"))
        db.add(Profile(user_id=u_texephyr.user_id, bio="WPU Texephyr Committee. Organizing MIT-WPU Pune's flagship national technical festival.", designation="Technical Fest Organization Committee"))
        db.commit()

        for u in new_users:
            db.add(NotificationPreference(user_id=u.user_id))
        db.commit()

        print("4. Seeding master skills catalog...")
        skills_dict = {}
        skills_list = [
            "React", "Python", "SQL", "Machine Learning", "CAD", "SolidWorks", 
            "UI/UX Design", "Digital Marketing", "IoT", "Public Speaking", 
            "Content Writing", "OpenCV", "ROS", "Docker", "AWS", 
            "Flutter", "Java", "C++", "Figma"
        ]
        for sname in skills_list:
            s = Skill(skill_name=sname)
            db.add(s)
            db.commit()
            skills_dict[sname] = s.skill_id

        # Associate skills
        db.add(UserSkill(user_id=1, skill_id=skills_dict["React"]))
        db.add(UserSkill(user_id=1, skill_id=skills_dict["UI/UX Design"]))
        db.add(UserSkill(user_id=1, skill_id=skills_dict["Figma"]))
        
        db.add(UserSkill(user_id=2, skill_id=skills_dict["Python"]))
        db.add(UserSkill(user_id=2, skill_id=skills_dict["Machine Learning"]))
        db.add(UserSkill(user_id=2, skill_id=skills_dict["AWS"]))
        
        db.add(UserSkill(user_id=u_aarav.user_id, skill_id=skills_dict["React"]))
        db.add(UserSkill(user_id=u_aarav.user_id, skill_id=skills_dict["Python"]))
        db.add(UserSkill(user_id=u_aarav.user_id, skill_id=skills_dict["Docker"]))
        
        db.add(UserSkill(user_id=u_riya.user_id, skill_id=skills_dict["CAD"]))
        db.add(UserSkill(user_id=u_riya.user_id, skill_id=skills_dict["SolidWorks"]))
        
        db.add(UserSkill(user_id=u_aditya.user_id, skill_id=skills_dict["Python"]))
        db.add(UserSkill(user_id=u_aditya.user_id, skill_id=skills_dict["Machine Learning"]))
        db.add(UserSkill(user_id=u_aditya.user_id, skill_id=skills_dict["SQL"]))
        
        db.add(UserSkill(user_id=u_rohan.user_id, skill_id=skills_dict["IoT"]))
        db.add(UserSkill(user_id=u_rohan.user_id, skill_id=skills_dict["ROS"]))
        db.add(UserSkill(user_id=u_rohan.user_id, skill_id=skills_dict["OpenCV"]))
        
        db.add(UserSkill(user_id=u_sneha.user_id, skill_id=skills_dict["Flutter"]))
        db.add(UserSkill(user_id=u_sneha.user_id, skill_id=skills_dict["Java"]))
        db.add(UserSkill(user_id=u_sneha.user_id, skill_id=skills_dict["Public Speaking"]))
        
        db.add(UserSkill(user_id=u_tanmay.user_id, skill_id=skills_dict["UI/UX Design"]))
        db.add(UserSkill(user_id=u_tanmay.user_id, skill_id=skills_dict["Figma"]))
        
        db.add(UserSkill(user_id=u_devendra.user_id, skill_id=skills_dict["C++"]))
        db.add(UserSkill(user_id=u_devendra.user_id, skill_id=skills_dict["Docker"]))
        db.add(UserSkill(user_id=u_devendra.user_id, skill_id=skills_dict["SQL"]))
        
        db.add(UserSkill(user_id=u_shreya.user_id, skill_id=skills_dict["Digital Marketing"]))
        db.add(UserSkill(user_id=u_shreya.user_id, skill_id=skills_dict["Content Writing"]))
        db.add(UserSkill(user_id=u_shreya.user_id, skill_id=skills_dict["Public Speaking"]))
        db.commit()

        print("5. Seeding connections network...")
        connections_list = [
            (1, 2), (1, u_aarav.user_id), (1, u_rajesh.user_id), (1, u_acm.user_id), (1, u_robotics.user_id), (1, u_sneha.user_id),
            (2, u_aarav.user_id), (2, u_rajesh.user_id), (2, u_aditya.user_id), (2, u_sneha.user_id),
            (u_aarav.user_id, u_rajesh.user_id), (u_aarav.user_id, u_sneha.user_id), (u_aarav.user_id, u_devendra.user_id),
            (u_sneha.user_id, u_acm.user_id),
            (u_aditya.user_id, u_rajesh.user_id), (u_aditya.user_id, u_acm.user_id),
            (u_rohan.user_id, u_riya.user_id), (u_rohan.user_id, u_robotics.user_id), (u_rohan.user_id, u_amita.user_id),
            (u_riya.user_id, u_baja.user_id), (u_riya.user_id, u_amita.user_id)
        ]
        for u1, u2 in connections_list:
            db.add(Connection(user_one=min(u1, u2), user_two=max(u1, u2)))
        db.commit()

        print("6. Seeding MIT-WPU communities...")
        c_acm = Community(community_name="MIT-WPU ACM Student Chapter", description="Computing chapter dedicated to coding hackathons, webinars, developer bootcamps, and coding events.", category="Clubs", logo_url="https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=150", created_by=u_acm.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_robotics = Community(community_name="MIT-WPU Robotics Club", description="National Robocon team and campus cell for autonomous robot design and electronics workshops.", category="Clubs", logo_url="https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=150", created_by=u_robotics.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_cse = Community(community_name="School of Computer Engineering", description="Official department community for B.Tech and M.Tech Computer Science students at MIT-WPU Pune. Official academic announcements.", category="Departments", logo_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=150", created_by=u_rajesh.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_aarohan = Community(community_name="WPU Aarohan Drama Club", description="Campus cultural theater and drama squad representing MIT-WPU in inter-college drama fests.", category="Clubs", logo_url="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=150", created_by=u_aarohan_club.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_baja = Community(community_name="WPU BAJA Racing Team", description="WPU team building off-road racing buggies and electric vehicles for national SAE competitions.", category="Clubs", logo_url="https://images.unsplash.com/photo-1532581291347-9c39cf10a73c?w=150", created_by=u_baja.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_texephyr = Community(community_name="WPU Texephyr Committee", description="Organizers of MIT-WPU Pune's flagship annual national technical festival, Texephyr.", category="Clubs", logo_url="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=150", created_by=u_texephyr.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_som = Community(community_name="School of Management", description="Official department community for MBA and BBA students at MIT-WPU.", category="Departments", logo_url="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=150", created_by=u_shreya.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        
        # Additional recommended communities
        c_data_sci = Community(community_name="MIT-WPU Data Science Society", description="Student-led data science forum exploring AI research, PyTorch models, Kaggle competitions, and big data architecture.", category="Clubs", logo_url="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=150", created_by=u_aditya.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_wit = Community(community_name="MIT-WPU Women in Tech Circle", description="Empowering women across engineering and design disciplines through technical mentorship, networking, and leadership circles.", category="Clubs", logo_url="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150", created_by=u_sneha.user_id, approval_status=ApprovalStatus.approved, approved_by=4)
        c_ecell = Community(community_name="MIT-WPU Entrepreneurship Cell", description="Campus incubator network supporting student founders from ideation to seed pitches, IP filing, and venture scaling.", category="Clubs", logo_url="https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=150", created_by=u_devendra.user_id, approval_status=ApprovalStatus.approved, approved_by=4)

        communities = [c_acm, c_robotics, c_cse, c_aarohan, c_baja, c_texephyr, c_som, c_data_sci, c_wit, c_ecell]
        for c in communities:
            db.add(c)
        db.commit()

        # Add owners/admins/members
        # ACM Chapter
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=u_acm.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=1, role="admin"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=2, role="member"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=u_aarav.user_id, role="member"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=u_sneha.user_id, role="member"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=u_devendra.user_id, role="member"))
        db.add(CommunityMember(community_id=c_acm.community_id, user_id=u_aditya.user_id, role="member"))

        # Robotics
        db.add(CommunityMember(community_id=c_robotics.community_id, user_id=u_robotics.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_robotics.community_id, user_id=u_riya.user_id, role="admin"))
        db.add(CommunityMember(community_id=c_robotics.community_id, user_id=u_rohan.user_id, role="member"))
        db.add(CommunityMember(community_id=c_robotics.community_id, user_id=u_amita.user_id, role="member"))

        # School of CSE
        db.add(CommunityMember(community_id=c_cse.community_id, user_id=u_rajesh.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_cse.community_id, user_id=3, role="admin"))
        for uid in [1, 2, u_aarav.user_id, u_aditya.user_id, u_sneha.user_id, u_devendra.user_id]:
            db.add(CommunityMember(community_id=c_cse.community_id, user_id=uid, role="member"))

        # Drama Club
        db.add(CommunityMember(community_id=c_aarohan.community_id, user_id=u_aarohan_club.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_aarohan.community_id, user_id=4, role="admin"))
        db.add(CommunityMember(community_id=c_aarohan.community_id, user_id=u_sneha.user_id, role="member"))
        db.add(CommunityMember(community_id=c_aarohan.community_id, user_id=u_tanmay.user_id, role="member"))
        db.add(CommunityMember(community_id=c_aarohan.community_id, user_id=1, role="member"))

        # BAJA Racing
        db.add(CommunityMember(community_id=c_baja.community_id, user_id=u_baja.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_baja.community_id, user_id=u_riya.user_id, role="admin"))
        db.add(CommunityMember(community_id=c_baja.community_id, user_id=u_rohan.user_id, role="member"))
        db.add(CommunityMember(community_id=c_baja.community_id, user_id=u_amita.user_id, role="member"))

        # Texephyr
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=u_texephyr.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=1, role="member"))
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=2, role="member"))
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=u_aarav.user_id, role="member"))
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=u_sneha.user_id, role="member"))
        db.add(CommunityMember(community_id=c_texephyr.community_id, user_id=u_devendra.user_id, role="member"))

        # Data Science Society
        db.add(CommunityMember(community_id=c_data_sci.community_id, user_id=u_aditya.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_data_sci.community_id, user_id=2, role="admin"))
        db.add(CommunityMember(community_id=c_data_sci.community_id, user_id=u_amita.user_id, role="member"))
        db.add(CommunityMember(community_id=c_data_sci.community_id, user_id=u_aarav.user_id, role="member"))
        db.add(CommunityMember(community_id=c_data_sci.community_id, user_id=1, role="member"))

        # Women in Tech Circle
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=u_sneha.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=1, role="admin"))
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=2, role="admin"))
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=u_riya.user_id, role="member"))
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=u_shreya.user_id, role="member"))
        db.add(CommunityMember(community_id=c_wit.community_id, user_id=u_amita.user_id, role="member"))

        # E-Cell
        db.add(CommunityMember(community_id=c_ecell.community_id, user_id=u_devendra.user_id, role="owner"))
        db.add(CommunityMember(community_id=c_ecell.community_id, user_id=u_shreya.user_id, role="admin"))
        db.add(CommunityMember(community_id=c_ecell.community_id, user_id=u_aarav.user_id, role="member"))
        db.add(CommunityMember(community_id=c_ecell.community_id, user_id=u_tanmay.user_id, role="member"))
        db.add(CommunityMember(community_id=c_ecell.community_id, user_id=1, role="member"))
        db.commit()

        print("7. Seeding social feed posts...")
        p1 = Post(user_id=u_rajesh.user_id, content="Research paper submissions for the MIT-WPU National Conference on Advanced Computing are now open. Final-year Computer Science students can submit their abstracts directly to my office. Let's make MIT-WPU proud with high-impact research!", visibility="public")
        p2 = Post(user_id=u_aarav.user_id, content="Excited to represent MIT-WPU Pune in the upcoming Smart India Hackathon! We are focusing on building automated disaster management systems using React and Python. Check out our collaboration post if you want to join us!", visibility="public")
        p3 = Post(user_id=u_riya.user_id, content="Our electric go-kart prototype is finally ready for track testing at the Pune campus! Big thanks to Dr. Amita Patel and the WPU BAJA Racing Cell for fabrication support and workshop access. CAD designs rendering looks amazing.", visibility="public")
        p4 = Post(user_id=u_aarohan_club.user_id, content="Auditions for the street play team (Nukkad Natak) representing MIT-WPU in Firodiya Karandak and Purushottam Karandak begin this Friday at 4 PM in the Kothrud Campus Open-Air Theater (OAT). Open to all departments! Bring your energy.", visibility="public")
        p5 = Post(user_id=1, content="Just completed the design mockups for the new CampusConnect web app. Used a neat, highly responsive layout with dark mode capabilities. Let me know what you guys think! UI/UX is super critical.", visibility="public")
        
        posts = [p1, p2, p3, p4, p5]
        for p in posts:
            db.add(p)
        db.commit()

        # Seed Likes
        for uid in [1, 2, u_aarav.user_id, u_aditya.user_id]:
            db.add(Like(user_id=uid, post_id=p1.post_id))
        for uid in [1, 2, u_sneha.user_id, u_devendra.user_id]:
            db.add(Like(user_id=uid, post_id=p2.post_id))
        for uid in [u_rohan.user_id, u_amita.user_id, 1]:
            db.add(Like(user_id=uid, post_id=p3.post_id))
        for uid in [2, u_aarav.user_id, u_sneha.user_id, u_tanmay.user_id]:
            db.add(Like(user_id=uid, post_id=p5.post_id))
        db.commit()

        # Seed Comments
        db.add(Comment(post_id=p1.post_id, user_id=2, comment_text="Sir, can we submit projects built during the Smart India Hackathon?"))
        db.add(Comment(post_id=p1.post_id, user_id=u_rajesh.user_id, comment_text="Yes Rujuta, if it contains novel implementation details and a structured methodology."))
        db.add(Comment(post_id=p1.post_id, user_id=u_aditya.user_id, comment_text="Sent you an email with my abstract, sir. Looking forward to your guidance."))
        
        db.add(Comment(post_id=p2.post_id, user_id=u_sneha.user_id, comment_text="Good luck Aarav! Bring home the trophy!"))
        db.add(Comment(post_id=p2.post_id, user_id=u_devendra.user_id, comment_text="Let me know if you need any backend orchestration or server deployment help."))
        
        db.add(Comment(post_id=p3.post_id, user_id=u_rohan.user_id, comment_text="The chassis stiffness looks incredibly solid. Great work team!"))
        db.add(Comment(post_id=p3.post_id, user_id=u_amita.user_id, comment_text="Excellent job Riya and team. Focus on load cell calibration next during track testing."))
        
        db.add(Comment(post_id=p4.post_id, user_id=u_tanmay.user_id, comment_text="Are you guys looking for scriptwriters as well?"))
        db.add(Comment(post_id=p4.post_id, user_id=u_aarohan_club.user_id, comment_text="Yes Tanmay, scriptwriters, actors, and percussionists are all welcome!"))
        
        db.add(Comment(post_id=p5.post_id, user_id=u_tanmay.user_id, comment_text="The visual style looks super clean, Prapti! Love the high contrast borders."))
        db.add(Comment(post_id=p5.post_id, user_id=2, comment_text="This is stunning! Can't wait to integrate the ML endpoints into this interface."))
        db.commit()

        print("8. Seeding community posts...")
        db.add(CommunityPost(community_id=c_acm.community_id, user_id=u_acm.user_id, content="Welcome to the official ACM Student Chapter community! We will be posting updates about code camps, guest lectures, and dev opportunities here. Prepare for the upcoming WPU-Hack 2026!"))
        db.add(CommunityPost(community_id=c_acm.community_id, user_id=u_sneha.user_id, content="Anyone interested in forming a team for the ACM ICPC regionals? Looking for strong competitive programmers in C++ or Java."))
        db.add(CommunityPost(community_id=c_robotics.community_id, user_id=u_robotics.user_id, content="National Robocon 2026 problem statements are out! The brainstorming session for autonomous picker mechanisms starts today in the Main Lab at 5 PM."))
        db.add(CommunityPost(community_id=c_robotics.community_id, user_id=u_rohan.user_id, content="Testing the LIDAR sensor node on ROS today. It detects obstacles within 5m accurately. Welcome to check it in the lab."))
        db.add(CommunityPost(community_id=c_cse.community_id, user_id=u_rajesh.user_id, content="Dear students, please note that the In-Sem Exam timetable for Semester V has been uploaded on the university ERP. Exams commence from July 10. Clear your fee dues before downloading hall tickets."))
        db.add(CommunityPost(community_id=c_cse.community_id, user_id=3, content="Reminder: The deadline for submitting capstone project proposals is this Friday. No extensions will be granted. Use the standard university format."))
        db.add(CommunityPost(community_id=c_texephyr.community_id, user_id=u_texephyr.user_id, content="Texephyr 2026 website goes live tonight! Huge thanks to the web development cell for working late hours to build it."))
        db.add(CommunityPost(community_id=c_data_sci.community_id, user_id=u_aditya.user_id, content="We have uploaded the baseline notebooks for our upcoming Kaggle campus challenge. Explore feature engineering techniques on the shared datasets!"))
        db.add(CommunityPost(community_id=c_wit.community_id, user_id=u_sneha.user_id, content="Excited to announce our upcoming Portfolio & Resume Clinic! Bring your GitHub and design showcases for 1-on-1 mentorship with senior peers and alumni."))
        db.add(CommunityPost(community_id=c_ecell.community_id, user_id=u_devendra.user_id, content="Applications for the Campus Venture Seed Grant 2026 are open. Teams with validated MVPs can book pitch slots for next week's demo night."))
        db.commit()

        print("9. Seeding events...")
        e1 = Event(
            title="WPU-Hack 2026 Hackathon",
            description="The annual 24-hour campus hackathon at MIT-WPU Pune. Team up, solve real-world statements, and win cash prizes up to INR 1,00,000. Hardware and software tracks are open.",
            category="Hackathons",
            venue="Dnyaneshwar Hall, MIT-WPU Kothrud Campus",
            start_datetime=datetime.now() + timedelta(days=5, hours=9),
            end_datetime=datetime.now() + timedelta(days=6, hours=12),
            registration_deadline=datetime.now() + timedelta(days=4),
            organizer_id=u_acm.user_id,
            community_id=c_acm.community_id,
            max_participants=250,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e2 = Event(
            title="ROS Autonomous Navigation Workshop",
            description="A hands-on workshop on configuring ROS (Robot Operating System), mapping with LIDAR, and navigating custom mobile robots.",
            category="Workshops",
            venue="Robotics Lab, School of Mechanical Engineering",
            start_datetime=datetime.now() + timedelta(days=3, hours=14),
            end_datetime=datetime.now() + timedelta(days=3, hours=18),
            registration_deadline=datetime.now() + timedelta(days=2),
            organizer_id=u_robotics.user_id,
            community_id=c_robotics.community_id,
            max_participants=60,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e3 = Event(
            title="Aarohan CultFest Auditions",
            description="Cultural drama auditions for street plays and stage dramas. Showcase your acting, scriptwriting, or drumming skills.",
            category="Cultural",
            venue="Main Auditorium Open Theater, Kothrud Campus",
            start_datetime=datetime.now() + timedelta(days=2, hours=16),
            end_datetime=datetime.now() + timedelta(days=2, hours=20),
            registration_deadline=datetime.now() + timedelta(days=1),
            organizer_id=u_aarohan_club.user_id,
            community_id=c_aarohan.community_id,
            max_participants=100,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e4 = Event(
            title="Placements Prep & Resume Review Webinar",
            description="A guide to cracking tech roles at top product companies. Sneak peek into resume screening rules and technical interview prep.",
            category="Webinars",
            venue="Virtual (Google Meet)",
            start_datetime=datetime.now() + timedelta(days=1, hours=18),
            end_datetime=datetime.now() + timedelta(days=1, hours=20),
            registration_deadline=datetime.now() + timedelta(days=1, hours=12),
            organizer_id=u_rajesh.user_id,
            community_id=c_cse.community_id,
            max_participants=500,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e5 = Event(
            title="Texephyr 2026 Fest Launch Event",
            description="Official launch ceremony of Texephyr 2026, unveiling this year's technical events, drone races, and robotics combat schedule.",
            category="Festivals",
            venue="Swami Vivekananda Hall, MIT-WPU",
            start_datetime=datetime.now() - timedelta(days=10, hours=10),
            end_datetime=datetime.now() - timedelta(days=10, hours=13),
            registration_deadline=datetime.now() - timedelta(days=11),
            organizer_id=u_texephyr.user_id,
            community_id=c_texephyr.community_id,
            max_participants=400,
            status=EventStatus.completed,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e6 = Event(
            title="AI & Data Science Research Colloquium",
            description="Interdisciplinary seminar showcasing faculty and student research papers in Large Language Models, PyTorch vision models, and federated learning.",
            category="Seminars",
            venue="Auditorium 2, Chhatrapati Shivaji Block",
            start_datetime=datetime.now() + timedelta(days=7, hours=10),
            end_datetime=datetime.now() + timedelta(days=7, hours=16),
            registration_deadline=datetime.now() + timedelta(days=6),
            organizer_id=u_aditya.user_id,
            community_id=c_data_sci.community_id,
            max_participants=180,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e7 = Event(
            title="Women in Tech Portfolio Clinic",
            description="Interactive showcase and portfolio critique session with leading industry practitioners. Gain feedback on UX case studies and coding repositories.",
            category="Workshops",
            venue="Design Studio 3, School of Design",
            start_datetime=datetime.now() + timedelta(days=4, hours=15),
            end_datetime=datetime.now() + timedelta(days=4, hours=18),
            registration_deadline=datetime.now() + timedelta(days=3),
            organizer_id=u_sneha.user_id,
            community_id=c_wit.community_id,
            max_participants=80,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e8 = Event(
            title="Campus Startup Pitch Night",
            description="Live venture pitching competition before angel investors and alumni entrepreneurs. Selected student startups receive incubation and cloud credits.",
            category="Competitions",
            venue="Innovation Hub Hall, MIT-WPU",
            start_datetime=datetime.now() + timedelta(days=8, hours=17),
            end_datetime=datetime.now() + timedelta(days=8, hours=21),
            registration_deadline=datetime.now() + timedelta(days=7),
            organizer_id=u_devendra.user_id,
            community_id=c_ecell.community_id,
            max_participants=150,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        e9 = Event(
            title="BAJA CAD Review & Workshop Induction",
            description="Technical review of SolidWorks assemblies for off-road ATVs and safety roll cages. New batch induction for vehicle assembly hands-on.",
            category="Workshops",
            venue="Mechanical Fabrication Workshop, MIT-WPU",
            start_datetime=datetime.now() + timedelta(days=6, hours=14),
            end_datetime=datetime.now() + timedelta(days=6, hours=19),
            registration_deadline=datetime.now() + timedelta(days=5),
            organizer_id=u_baja.user_id,
            community_id=c_baja.community_id,
            max_participants=75,
            status=EventStatus.upcoming,
            approval_status=ApprovalStatus.approved,
            approved_by=4
        )
        
        events = [e1, e2, e3, e4, e5, e6, e7, e8, e9]
        for e in events:
            db.add(e)
        db.commit()

        # Register users to events
        for uid in [1, 2, u_aarav.user_id, u_aditya.user_id, u_sneha.user_id, u_devendra.user_id]:
            db.add(EventRegistration(event_id=e1.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [u_riya.user_id, u_rohan.user_id, u_aarav.user_id]:
            db.add(EventRegistration(event_id=e2.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [u_sneha.user_id, u_tanmay.user_id, 1]:
            db.add(EventRegistration(event_id=e3.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [1, 2, u_aarav.user_id, u_sneha.user_id, u_devendra.user_id, u_aditya.user_id]:
            db.add(EventRegistration(event_id=e4.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [1, 2, u_aarav.user_id, u_sneha.user_id]:
            db.add(EventRegistration(event_id=e5.event_id, user_id=uid, registration_status=RegistrationStatus.attended))
        for uid in [1, 2, u_aditya.user_id, u_aarav.user_id, u_amita.user_id]:
            db.add(EventRegistration(event_id=e6.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [1, 2, u_sneha.user_id, u_riya.user_id, u_shreya.user_id]:
            db.add(EventRegistration(event_id=e7.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [u_devendra.user_id, u_aarav.user_id, u_tanmay.user_id, u_shreya.user_id, 1]:
            db.add(EventRegistration(event_id=e8.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        for uid in [u_riya.user_id, u_rohan.user_id, u_amita.user_id]:
            db.add(EventRegistration(event_id=e9.event_id, user_id=uid, registration_status=RegistrationStatus.registered))
        db.commit()

        print("10. Seeding collaboration marketplace opportunities...")
        col1 = Collaboration(
            title="Smart India Hackathon 2026 - Disaster Management Portal",
            description="Looking for B.Tech CSE students interested in joining our team for SIH 2026. The project involves predicting flood and landslide risks in real-time. We need ML enthusiasts and frontend developers.",
            category="Hackathons",
            required_skills="React, Python, Machine Learning",
            positions_available=3,
            deadline=datetime.now() + timedelta(days=10),
            status=CollaborationStatus.open,
            created_by=u_aarav.user_id
        )
        col2 = Collaboration(
            title="SAE BAJA Electric Buggy Chassis Design",
            description="Forming a sub-team to optimize load distribution and chassis welding specs in SolidWorks. Looking for students with good CAD skills who can work in the campus workshop.",
            category="Engineering Design",
            required_skills="CAD, SolidWorks",
            positions_available=2,
            deadline=datetime.now() + timedelta(days=15),
            status=CollaborationStatus.open,
            created_by=u_riya.user_id,
            community_id=c_baja.community_id
        )
        col3 = Collaboration(
            title="ACM Student Chapter Website Developer",
            description="We are redesigning the official MIT-WPU ACM Chapter portal. Seeking students with clean UI/UX Design and React capabilities. Great addition to your resume!",
            category="Club Projects",
            required_skills="React, UI/UX Design",
            positions_available=2,
            deadline=datetime.now() + timedelta(days=7),
            status=CollaborationStatus.open,
            created_by=u_acm.user_id,
            community_id=c_acm.community_id
        )
        col4 = Collaboration(
            title="School of Design Virtual Exhibition Portal",
            description="Building a React web app to showcase student portfolios and sketches. Needs Figma designs converted to smooth React pages.",
            category="Design Projects",
            required_skills="UI/UX Design, Figma, React",
            positions_available=1,
            deadline=datetime.now() - timedelta(days=2),
            status=CollaborationStatus.completed,
            created_by=u_tanmay.user_id
        )
        
        collabs = [col1, col2, col3, col4]
        for col in collabs:
            db.add(col)
        db.commit()

        # Seed Applications
        db.add(Application(
            collaboration_id=col1.collaboration_id,
            applicant_id=u_aditya.user_id,
            application_message="Hi Aarav, I am Aditya, a 1st year M.Tech Data Science student at MIT-WPU. I have strong experience in Python and ML, and I can build out the flood risk forecasting models for the SIH project.",
            status=ApplicationStatus.accepted
        ))
        db.add(Application(
            collaboration_id=col1.collaboration_id,
            applicant_id=2,
            application_message="Hey Aarav! I've been building web APIs with FastAPI and handling AWS deployments. I can set up the backend architecture, Docker containers, and database pipelines.",
            status=ApplicationStatus.pending
        ))
        db.add(Application(
            collaboration_id=col1.collaboration_id,
            applicant_id=u_devendra.user_id,
            application_message="Hi Aarav. I am a 4th year student. I can scale the backend. However, I have another offer for a different project, so let me know soon.",
            status=ApplicationStatus.rejected
        ))
        
        db.add(Application(
            collaboration_id=col2.collaboration_id,
            applicant_id=u_rohan.user_id,
            application_message="Hi Riya! I am Rohan from ECE 2nd year. I am very interested in automotive design. I can help integrate telemetry sensors, data loggers, and write ROS scripts for chassis navigation metrics.",
            status=ApplicationStatus.accepted
        ))
        db.add(Application(
            collaboration_id=col2.collaboration_id,
            applicant_id=u_tanmay.user_id,
            application_message="I can assist in rendering and designing the exterior livery/vinyl for the electric vehicle in Blender or CAD.",
            status=ApplicationStatus.pending
        ))
        
        db.add(Application(
            collaboration_id=col3.collaboration_id,
            applicant_id=1,
            application_message="Hi ACM web cell! I am Prapti, 3rd year CSE. I've designed the modern CampusConnect platform. I'd love to lead the UI/UX and React front-end development for the ACM chapter portal.",
            status=ApplicationStatus.pending
        ))
        db.add(Application(
            collaboration_id=col3.collaboration_id,
            applicant_id=u_sneha.user_id,
            application_message="Hello, I have worked on mobile layouts and React portals. I can help structure the responsiveness and routing in the app.",
            status=ApplicationStatus.pending
        ))
        
        db.add(Application(
            collaboration_id=col4.collaboration_id,
            applicant_id=1,
            application_message="Hey Tanmay, I have strong experience in React and Figma. I'd love to help you build out the virtual portfolio website.",
            status=ApplicationStatus.accepted
        ))
        db.commit()

        # ---------------------------------------------------------
        # RESOURCE HUB
        # ---------------------------------------------------------
        print("11. Seeding Resource Hub data...")
        base_backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        res_dirs = {
            "event": os.path.join(base_backend_dir, "uploads", "resources", "events"),
            "community": os.path.join(base_backend_dir, "uploads", "resources", "communities"),
            "collaboration": os.path.join(base_backend_dir, "uploads", "resources", "collaborations"),
        }
        for d in res_dirs.values():
            os.makedirs(d, exist_ok=True)

        resource_specs = [
            {
                "title": "WPU-Hack 2026 Hackathon Starter Guide",
                "description": "Quick-start guide covering team formation, judging criteria, submission checklist, and presentation tips.",
                "resource_type": ResourceType.event,
                "reference_id": e1.event_id,
                "uploaded_by": u_acm.user_id,
                "file_name": "wpu_hack_2026_starter_guide.txt",
                "folder": "event",
                "static_url_prefix": "/static/resources/events/",
                "content": "WPU-Hack 2026 Hackathon Starter Guide\n\nTeam formation checklist\nProblem statement review\nPrototype and testing checklist\nFinal submission checklist\nPitch presentation recommendations\n"
            },
            {
                "title": "ROS Autonomous Navigation Workshop Notes",
                "description": "Workshop notes covering ROS nodes, topics, navigation stacks, sensors, and simulation workflow.",
                "resource_type": ResourceType.event,
                "reference_id": e2.event_id,
                "uploaded_by": u_robotics.user_id,
                "file_name": "ros_navigation_workshop_notes.txt",
                "folder": "event",
                "static_url_prefix": "/static/resources/events/",
                "content": "ROS Autonomous Navigation Workshop Notes\n\nROS concepts\nNodes and topics\nSensor integration\nNavigation stack overview\nSimulation workflow\n"
            },
            {
                "title": "React + FastAPI Campus Project Guide",
                "description": "Reference notes for connecting a React frontend with FastAPI REST APIs using Axios and JWT authentication.",
                "resource_type": ResourceType.community,
                "reference_id": c_cse.community_id,
                "uploaded_by": u_aarav.user_id,
                "file_name": "react_fastapi_project_guide.txt",
                "folder": "community",
                "static_url_prefix": "/static/resources/communities/",
                "content": "React + FastAPI Campus Project Guide\n\nFrontend API organisation\nAxios configuration\nJWT authentication flow\nError handling\nRecommended project structure\n"
            },
            {
                "title": "Database Design Revision Notes",
                "description": "Concise database revision material covering normalization, relationships, indexing, and transactions.",
                "resource_type": ResourceType.community,
                "reference_id": c_data_sci.community_id,
                "uploaded_by": u_aditya.user_id,
                "file_name": "database_design_revision_notes.txt",
                "folder": "community",
                "static_url_prefix": "/static/resources/communities/",
                "content": "Database Design Revision Notes\n\nNormalization\nPrimary and foreign keys\nOne-to-many and many-to-many relationships\nIndexes\nTransactions\n"
            },
            {
                "title": "CampusConnect UI/UX Design Checklist",
                "description": "Practical checklist for accessible layouts, responsive components, typography, spacing, and interaction states.",
                "resource_type": ResourceType.community,
                "reference_id": c_acm.community_id,
                "uploaded_by": 1,
                "file_name": "campusconnect_uiux_checklist.txt",
                "folder": "community",
                "static_url_prefix": "/static/resources/communities/",
                "content": "CampusConnect UI/UX Checklist\n\nResponsive layouts\nReadable typography\nAccessible controls\nLoading states\nEmpty states\nError states\n"
            },
            {
                "title": "Startup Pitch Deck Template",
                "description": "A simple pitch structure for students preparing startup or project presentations.",
                "resource_type": ResourceType.collaboration,
                "reference_id": col1.collaboration_id,
                "uploaded_by": u_devendra.user_id,
                "file_name": "startup_pitch_deck_template.txt",
                "folder": "collaboration",
                "static_url_prefix": "/static/resources/collaborations/",
                "content": "Startup Pitch Deck Template\n\n1. Problem\n2. Target users\n3. Proposed solution\n4. Market opportunity\n5. Product demonstration\n6. Business model\n7. Roadmap\n"
            },
            {
                "title": "BAJA CAD Review Checklist",
                "description": "Engineering review checklist for CAD assemblies, dimensions, mounting points, and documentation.",
                "resource_type": ResourceType.event,
                "reference_id": e9.event_id,
                "uploaded_by": u_baja.user_id,
                "file_name": "baja_cad_review_checklist.txt",
                "folder": "event",
                "static_url_prefix": "/static/resources/events/",
                "content": "BAJA CAD Review Checklist\n\nAssembly constraints\nCritical dimensions\nFastener and mounting review\nClearance checks\nManufacturing feasibility\nRevision documentation\n"
            },
            {
                "title": "Portfolio Case Study Structure",
                "description": "Suggested structure for student design and technology portfolios, including problem, process, outcome, and reflection.",
                "resource_type": ResourceType.community,
                "reference_id": c_wit.community_id,
                "uploaded_by": u_sneha.user_id,
                "file_name": "portfolio_case_study_structure.txt",
                "folder": "community",
                "static_url_prefix": "/static/resources/communities/",
                "content": "Portfolio Case Study Structure\n\nProject overview\nProblem statement\nResearch\nDesign process\nIterations\nFinal outcome\nReflection\n"
            },
            {
                "title": "Machine Learning Research Reading List",
                "description": "Curated starting list of topics for students exploring machine learning research and reproducible experimentation.",
                "resource_type": ResourceType.event,
                "reference_id": e6.event_id,
                "uploaded_by": u_amita.user_id,
                "file_name": "machine_learning_research_reading_list.txt",
                "folder": "event",
                "static_url_prefix": "/static/resources/events/",
                "content": "Machine Learning Research Reading List\n\nModel evaluation\nDataset quality\nBaseline selection\nReproducibility\nExperiment tracking\nResearch paper reading workflow\n"
            },
            {
                "title": "Student Event Planning Checklist",
                "description": "Planning checklist for student clubs organising workshops, competitions, talks, and cultural activities.",
                "resource_type": ResourceType.community,
                "reference_id": c_texephyr.community_id,
                "uploaded_by": 4,
                "file_name": "student_event_planning_checklist.txt",
                "folder": "community",
                "static_url_prefix": "/static/resources/communities/",
                "content": "Student Event Planning Checklist\n\nVenue confirmation\nFaculty approval\nRegistration setup\nVolunteer allocation\nPublicity\nEvent-day logistics\nFeedback collection\n"
            },
        ]

        for spec in resource_specs:
            target_dir = res_dirs[spec["folder"]]
            abs_disk_path = os.path.join(target_dir, spec["file_name"])
            with open(abs_disk_path, "w", encoding="utf-8") as f:
                f.write(spec["content"])
            
            file_size = os.path.getsize(abs_disk_path)
            static_file_path = f"{spec['static_url_prefix']}{spec['file_name']}"

            db.add(Resource(
                title=spec["title"],
                description=spec["description"],
                resource_type=spec["resource_type"],
                reference_id=spec["reference_id"],
                uploaded_by=spec["uploaded_by"],
                file_path=static_file_path,
                file_size=file_size,
                file_type="txt",
                is_deleted=False
            ))

        db.commit()

        # ---------------------------------------------------------
        # DIRECT MESSAGES
        # ---------------------------------------------------------
        print("12. Seeding direct message conversations...")

        direct_chat_specs = [
            (
                (1, 2),
                [
                    (1, "Hey Rujuta, did you finish the system-design notes for the hackathon?"),
                    (2, "Almost. I added the API and database sections this afternoon."),
                    (1, "Nice. I can review the frontend integration once you push it."),
                    (2, "Perfect, I will send the updated version tonight."),
                ]
            ),
            (
                (1, u_aarav.user_id),
                [
                    (u_aarav.user_id, "Hi Prapti! Are you still interested in helping with the SIH dashboard?"),
                    (1, "Yes. I can take the UI flow and connect it to the existing API contract."),
                    (u_aarav.user_id, "Great. Aditya is handling the ML side, so the three pieces should fit well."),
                    (1, "Send me the latest wireframe when you have it."),
                ]
            ),
            (
                (2, u_aditya.user_id),
                [
                    (2, "Aditya, are you presenting the model results at the research colloquium?"),
                    (u_aditya.user_id, "Yes, I am preparing a short reproducibility section as well."),
                    (2, "That will be useful. Keep the metrics and baseline comparison clear."),
                ]
            ),
            (
                (u_riya.user_id, u_rohan.user_id),
                [
                    (u_riya.user_id, "Can you check the sensor mounting dimensions before the BAJA workshop?"),
                    (u_rohan.user_id, "Sure. I will compare them with the latest CAD assembly."),
                    (u_riya.user_id, "Thanks. Let me know if the bracket needs another revision."),
                ]
            ),
            (
                (u_sneha.user_id, u_tanmay.user_id),
                [
                    (u_sneha.user_id, "Are you joining the portfolio clinic next week?"),
                    (u_tanmay.user_id, "Yes. I want feedback on the exhibition project case study."),
                    (u_sneha.user_id, "Bring the latest version; we can review the storytelling together."),
                ]
            ),
            (
                (u_rajesh.user_id, 1),
                [
                    (u_rajesh.user_id, "Prapti, please keep the capstone documentation updated before the next review."),
                    (1, "Will do, sir. I have added the architecture and testing sections."),
                    (u_rajesh.user_id, "Good. Please also include the deployment notes and final screenshots."),
                ]
            ),
        ]

        for (user_one, user_two), messages in direct_chat_specs:
            all_directs = db.query(Conversation).filter(Conversation.conversation_type == ConversationType.direct).all()
            matched_conv = None
            for c in all_directs:
                p_uids = {p.user_id for p in c.participants}
                if p_uids == {user_one, user_two}:
                    matched_conv = c
                    break

            if matched_conv:
                continue

            conversation = Conversation(
                conversation_type=ConversationType.direct,
                created_by=user_one,
                created_at=datetime.now() - timedelta(minutes=len(messages) * 8)
            )
            db.add(conversation)
            db.flush()

            db.add_all([
                ConversationParticipant(
                    conversation_id=conversation.conversation_id,
                    user_id=uid
                )
                for uid in {user_one, user_two}
            ])

            created_messages = []
            base_time = datetime.now() - timedelta(minutes=len(messages) * 6)

            for index, (sender_id, text_message) in enumerate(messages):
                message = Message(
                    conversation_id=conversation.conversation_id,
                    sender_id=sender_id,
                    message_text=text_message,
                    created_at=base_time + timedelta(minutes=index * 6)
                )
                db.add(message)
                db.flush()
                created_messages.append(message)

            # Mark all earlier messages as read, leave the last one unread
            for message in created_messages[:-1]:
                reader_id = user_two if message.sender_id == user_one else user_one
                db.add(
                    MessageRead(
                        message_id=message.message_id,
                        user_id=reader_id
                    )
                )

        db.commit()

        # ---------------------------------------------------------
        # SEARCH HISTORY
        # ---------------------------------------------------------
        print("13. Seeding search history...")
        db.add(SearchHistory(user_id=1, search_query="React"))
        db.add(SearchHistory(user_id=1, search_query="Hackathon"))
        db.add(SearchHistory(user_id=1, search_query="Robotics"))
        db.add(SearchHistory(user_id=1, search_query="Aarohan"))

        db.add(SearchHistory(user_id=2, search_query="Machine Learning"))
        db.add(SearchHistory(user_id=2, search_query="AWS"))
        db.add(SearchHistory(user_id=2, search_query="Python"))

        db.add(SearchHistory(user_id=u_aarav.user_id, search_query="FastAPI"))
        db.add(SearchHistory(user_id=u_aarav.user_id, search_query="CAD"))
        db.add(SearchHistory(user_id=u_aarav.user_id, search_query="Aditya"))
        db.commit()

        # ---------------------------------------------------------
        # NOTIFICATIONS
        # ---------------------------------------------------------
        print("14. Seeding user interaction notifications...")
        db.add(Notification(
            sender_id=u_sneha.user_id,
            receiver_id=1,
            notification_type=NotificationType.connection_accepted,
            title="Connection Accepted",
            message="Sneha Kulkarni accepted your connection request.",
            reference_id=u_sneha.user_id,
            reference_type=ReferenceType.user,
            is_read=False
        ))
        db.add(Notification(
            sender_id=2,
            receiver_id=1,
            notification_type=NotificationType.like,
            title="Post Liked",
            message="Rujuta Dani liked your post about CampusConnect designs.",
            reference_id=p5.post_id,
            reference_type=ReferenceType.post,
            is_read=False
        ))
        db.add(Notification(
            sender_id=u_tanmay.user_id,
            receiver_id=1,
            notification_type=NotificationType.comment,
            title="New Comment",
            message="Tanmay Gokhale commented on your post: 'The visual style looks super clean, Prapti!...'",
            reference_id=p5.post_id,
            reference_type=ReferenceType.post,
            is_read=True
        ))
        db.add(Notification(
            sender_id=u_tanmay.user_id,
            receiver_id=1,
            notification_type=NotificationType.application_accepted,
            title="Application Accepted",
            message="Your application to 'School of Design Virtual Exhibition Portal' has been Accepted!",
            reference_id=col4.collaboration_id,
            reference_type=ReferenceType.collaboration,
            is_read=False
        ))
        db.add(Notification(
            sender_id=u_acm.user_id,
            receiver_id=1,
            notification_type=NotificationType.event_created,
            title="New Event Added",
            message="MIT-WPU ACM Student Chapter announced a new event: 'WPU-Hack 2026 Hackathon'.",
            reference_id=e1.event_id,
            reference_type=ReferenceType.event,
            is_read=False
        ))

        db.add(Notification(
            sender_id=u_rajesh.user_id,
            receiver_id=2,
            notification_type=NotificationType.comment,
            title="New Reply from Faculty",
            message="Dr. Rajesh Kulkarni replied to your comment: 'Yes Rujuta, if it contains novel...'",
            reference_id=p1.post_id,
            reference_type=ReferenceType.post,
            is_read=False
        ))
        db.add(Notification(
            sender_id=u_aditya.user_id,
            receiver_id=2,
            notification_type=NotificationType.connection_accepted,
            title="Connection Accepted",
            message="Aditya Joshi accepted your connection request.",
            reference_id=u_aditya.user_id,
            reference_type=ReferenceType.user,
            is_read=False
        ))

        db.add(Notification(
            sender_id=2,
            receiver_id=u_aarav.user_id,
            notification_type=NotificationType.application_received,
            title="Application Received",
            message="Rujuta Dani applied to your project 'Smart India Hackathon 2026 - Disaster Management Portal'.",
            reference_id=col1.collaboration_id,
            reference_type=ReferenceType.collaboration,
            is_read=False
        ))
        db.add(Notification(
            sender_id=u_aditya.user_id,
            receiver_id=u_aarav.user_id,
            notification_type=NotificationType.event_registration,
            title="Event Attendee Registered",
            message="Aditya Joshi registered for 'WPU-Hack 2026 Hackathon' organized by ACM.",
            reference_id=e1.event_id,
            reference_type=ReferenceType.event,
            is_read=True
        ))
        db.commit()

        print("\nMIT-WPU Pune campus dataset seeded successfully! 🎓🎉")
        print("Detailed profiles, posts, communities, events, resources, direct messages, collaborations, search logs, and notifications are ready.")

    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    seed_mitwpu_data()
