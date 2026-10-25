# CampusConnect Synopsis Diagrams

This document contains visual diagrams for the CampusConnect platform's synopsis, representing the system's actors, core use cases, and workflows.

---

## 1. Use Case Diagram

The Use Case diagram illustrates the interactions between different user roles (**Student**, **Faculty**, and **Admin**) and the platform's features using a flowchart layout.

```mermaid
flowchart LR
    Student[Student]
    Faculty[Faculty Member]
    Admin[Admin]

    subgraph CampusConnect [CampusConnect System]
        UC_Auth(Authenticate Register/Login)
        UC_Profile(Manage Profile & Skills)
        UC_Network(Connect & Manage Network)
        UC_Feed(Post, Comment & React)
        UC_Delete(Soft Delete & Undo Content)
        UC_Msg(Direct & Group Messaging)
        UC_Comm(Join & Interact in Communities)
        UC_Event(Browse & Register for Events)
        UC_Collab(Browse & Apply to Collaborations)
        UC_Resources(Upload & Download Resources)
        UC_Notices_Recv(Receive Official Notices)
        
        UC_Notices_Create(Create & Target Official Notices)
        UC_Faculty_Dash(Access Faculty Dashboard)
        UC_Dir_Msg(Message Users Immediately)
        
        UC_Verify_Faculty(Approve/Reject Faculty Registrations)
        UC_Mod(Moderate Flagged Content & Reports)
        UC_Analytics(View Platform Analytics & Insights)
    end

    Student --> UC_Auth
    Student --> UC_Profile
    Student --> UC_Network
    Student --> UC_Feed
    Student --> UC_Delete
    Student --> UC_Msg
    Student --> UC_Comm
    Student --> UC_Event
    Student --> UC_Collab
    Student --> UC_Resources
    Student --> UC_Notices_Recv

    Faculty --> UC_Auth
    Faculty --> UC_Profile
    Faculty --> UC_Notices_Create
    Faculty --> UC_Faculty_Dash
    Faculty --> UC_Dir_Msg
    Faculty --> UC_Resources

    Admin --> UC_Verify_Faculty
    Admin --> UC_Mod
    Admin --> UC_Analytics
```

---

## 2. Core Workflows

These workflow diagrams trace key business logic processes inside the system.

### A. Faculty Verification & Approval Workflow

This sequence shows the path of a faculty registration from submission to badge activation.

```mermaid
sequenceDiagram
    autonumber
    actor Faculty as Faculty User
    participant App as Frontend Client
    participant API as Backend API
    actor Admin as System Administrator

    Faculty->>App: Submits Register Form (role=faculty + designation/employee_id)
    App->>API: POST /api/auth/register
    Note over API: User created with role="faculty"<br/>and is_verified=False
    API-->>App: Registration successful (Pending state)
    
    Admin->>App: Opens Admin Approval Dashboard
    App->>API: GET /api/admin/teachers/pending
    API-->>App: Returns list of pending faculty users
    Admin->>App: Clicks "Approve"
    App->>API: POST /api/admin/teachers/{user_id}/approve
    Note over API: Sets is_verified = True<br/>Logs Admin action
    API-->>App: Success response
    Note over App: Faculty Verification Badge<br/>displays globally beside name
```

### B. Official Notice Targeting & Dispatch (Fan-out)

This diagram shows how notices are published and targeted to specific student groups.

```mermaid
flowchart TD
    Start([Faculty creates Notice]) --> TargetCheck{Resolve Target Audience}
    
    TargetCheck -- "all_students" --> FindStudents[Query all users with role='student']
    TargetCheck -- "all_teachers" --> FindTeachers[Query all users with role='teacher']
    TargetCheck -- "specific_community" --> FindCommMembers[Query all members of community_id]
    TargetCheck -- "specific_event" --> FindEventRegs[Query all registered users of event_id]
    
    FindStudents --> CreateRecipients[Insert notice_recipients records]
    FindTeachers --> CreateRecipients
    FindCommMembers --> CreateRecipients
    FindEventRegs --> CreateRecipients
    
    CreateRecipients --> NotificationBell[Create bell notifications for users]
    NotificationBell --> Complete([Notice Published & Dispatched])
```

### C. Faculty Directory Instant Messaging (Connection Bypass)

This workflow shows the bypass security rule that allows users to message faculty directly without needing a connection first.

```mermaid
sequenceDiagram
    autonumber
    actor User as Student User
    participant App as Frontend Client
    participant API as Backend API
    participant DB as Database

    User->>App: Clicks "Message" on Faculty Directory Card
    Note over App: Triggers createOrGetConversation<br/>with from_faculty_directory: true
    App->>API: POST /api/conversations
    Note over API: Checks recipient role & is_verified<br/>Bypasses connection gate check
    API->>DB: Get or Create direct conversation
    DB-->>API: Returns conversation_id
    API-->>App: Success response
    App->>User: Redirects to Messages view
    User->>App: Sends text message
    App->>API: Sends message (WebSocket/API)
    Note over API: Bypasses connection check<br/>since recipient is Faculty
    API-->>User: Message delivered successfully
```
