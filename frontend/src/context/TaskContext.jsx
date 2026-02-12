import { createContext, useState } from "react";

export const TaskContext = createContext();

export const TaskProvider = ({ children }) => {
  const [tasks] = useState([
    {
      id: 1,
      title: "User Card",
      route: "/user-card",
      date: "31 Dec 2025",
      assignedDate: "2025-12-30",
      completedDate: "2025-12-31",
      status: "completed"
    },
    {
      id: 2,
      title: "Contact Form",
      route: "/contact-form",
      date: "16 Jan 2025",
      assignedDate: "2026-01-31",
      completedDate: "2026-01-02",
      status: "completed"
    },

        {
      id: 5,
      title: "NodeMailer with Cloudinary",
      route: "/nodemailer_cloudinary",
      date: "02 Jan 2025",
      assignedDate: "2026-01-02",
      completedDate: "2026-01-05",
      status: "completed"
    },
       {
      id: 5,
      title: "Task-3 Authentication (Login/Signup With Firebase and JWT)",
      route: "/auth",
      date: "19 Jan 2025",
      assignedDate: "2026-01-05",
      completedDate: "2026-01-06",
      status: "completed"
    },
   
    {
      id: 4,
      title: "Chat Application",
      route: "/chatbot",
      date: "18 Jan 2025",
      assignedDate: "2026-01-06",
      completedDate: "2026-01-07",
      status: "completed"
    },

      {
      id: 6,
      title: "Real-Time Chat Application (Task-5)",
      route: "/chatbot2/login",
      date: "20 Jan 2025",
      assignedDate: "2026-01-07",
      completedDate: "2026-01-09",
      status: "completed"
    },

 
 
  
    {
      id: 7,
      title: "Passport Authentication (Task-6)",
      route: "/passport/login",
      date: "21 Jan 2025",
      assignedDate: "2026-01-12",
      completedDate: "2026-01-13",
      status: "completed"
    }
  ]);

  return (
    <TaskContext.Provider value={{ tasks }}>
      {children}
    </TaskContext.Provider>
  );
};