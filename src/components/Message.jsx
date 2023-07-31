import React, { useContext, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";

const Message = ({ message }) => {
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  var d = new Date(message.date.seconds * 1000 + message.date.nanoseconds / 1000000);
  const localtime = d.toLocaleString([],{year: 'numeric', 
  month: 'numeric', day: 'numeric', 
  hour: '2-digit', minute: '2-digit'});

  const ref = useRef();
  
  const lessThanOneDayAgo = (date) => {
    const day = 1000 * 60 * 60 * 24;
    const dayAgo = Date.now() - day;
    return date > dayAgo;
  }

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  return (
    <div
      ref={ref}
      className={`message ${message.senderId === currentUser.uid && "owner"}`}
    >
      <div className="messageInfo">
        <img
          src={
            message.senderId === currentUser.uid
              ? currentUser.photoURL
              : data.user.photoURL
          }
          alt=""
        />
        <span>{localtime}</span>
      </div>
      <div className="messageContent">
        <p>{message.text}</p>
        {message.img && <img src={message.img} alt="" />}
      </div>
    </div>
  );
};

export default Message;