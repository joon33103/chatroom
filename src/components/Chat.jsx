import React, {useState, useContext } from "react";
import Cam from "../img/cam.png";
import Add from "../img/add.png";
import More from "../img/more.png";
import Messages from "./Messages";
import Input from "./Input";
import { AuthContext } from "../context/AuthContext";
import { ChatContext } from "../context/ChatContext";
import Video from "./Video";

const Chat = () => {
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  // const [videoActiveID, setvideoActiveID] = useState(null);
  const handlevideoClick = async () => {
    setvideoActiveID(data.chatId);
  }

  return (
    <div className="chat">
      <div className="chatInfo">
        <span>{data.user?.displayName}</span>
        <div className="chatIcons">
          {/* <button onClick={handlevideoClick}>
            <img className="videoButton" src={Cam} alt="" />
          </button> */}
          {/* <button>
            <img src={Add} alt="" />
          </button>
          <button>
            <img src={More} alt="" />
          </button> */}
        </div>
      </div>
      {<Messages />}
      {<Input/>}

    </div>
  );
};

export default Chat;