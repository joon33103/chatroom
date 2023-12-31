import {
    createContext,
    useContext,
    useReducer,
    useState,
    useEffect
  } from "react";
  import { AuthContext } from "./AuthContext";
  import { auth } from "../firebase";
  import { onAuthStateChanged } from "firebase/auth";

  
  export const ChatContext = createContext();
  
  export const ChatContextProvider = ({ children }) => {
    const { currentUser } = useContext(AuthContext);
    const INITIAL_STATE = {
      chatId: "null",
      user: {},
    };
    // const [videoActiveID, setvideoActiveID] = useState(null);
    // const toggleVideo = (activate) => {
    //   if (activate) {
    //     setvideoActiveID(true);
    //   } 
    //   else {
    //     setvideoActiveID(false);
    //   }
    // }
    
  
    const chatReducer = (state, action) => {
      switch (action.type) {
        case "CHANGE_USER":
          return {
            user: action.payload,
            chatId:
              currentUser.uid > action.payload.uid
                ? currentUser.uid + action.payload.uid
                : action.payload.uid + currentUser.uid,
          };
  
        default:
          return state;
      }
    };
  
    const [state, dispatch] = useReducer(chatReducer, INITIAL_STATE);
  
    return (
      <ChatContext.Provider value={{ data:state, dispatch }}>
        {children}
      </ChatContext.Provider>
    );
  };