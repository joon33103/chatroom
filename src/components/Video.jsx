import React, { useEffect, useContext} from 'react'
import "../css/video.css"
import { doc, onSnapshot,addDoc,setDoc,collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { auth } from '../firebase'
import { AuthContext } from '../context/AuthContext'
import { ChatContext } from "../context/ChatContext";
import { v4 as uuid } from "uuid";

const Video = () => {
  const { currentUser } = useContext(AuthContext);
  const { data } = useContext(ChatContext);
  let webcamVideo = null;
  let callButton = null;
  let callInput = null;
  let answerButton = null;
  let remoteVideo = null;
  let hangupButton = null;
  console.log("currentUser" + currentUser.uid);
  console.log("chatContext data" + data);

  const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'], // free stun server
      },
    ],
    iceCandidatePoolSize: 10,
  };

  // global states
  const pc = new RTCPeerConnection(servers);
  console.log("servers = " + servers);
  console.log("peer connection = " + pc);
  let localStream = null; 
  let remoteStream = null;

  const videoClicked = async () => {
    // setting local stream to the video from our camera
    localStream = await navigator.mediaDevices.getUserMedia({
      video: {width: 150, height: 150},
      audio: true,

    })
    console.log("localStream at start = " + localStream);
    // initalizing the remote server to the mediastream
    remoteStream = new MediaStream();
    // Pushing tracks from local stream to peerConnection
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    })
    pc.ontrack = event => {
        event.streams[0].getTracks(track => {
            remoteStream.addTrack(track)
            console.log(track)
        })
    }  
    // displaying the video data from the stream to the webpage
    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
    console.log(remoteStream);

    
  }
  const queryCallsFromID = async (chatId) => {
    const q = query(collection(db, "calls"), where("__name__", "==", "{chatId}"));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      console.log("result of querying for chatId in calls: " + doc.id + "=>" + doc.data());
      if (doc.id === chatId) {
        return true;
      }
    }
    )
    return false;
  }
  const monitorIncomingCall = () => {
    if (queryCallsFromID(data.chatId)) {
      callInput.value = data.chatId;
    }
    const unsub = onSnapshot(doc(db, "calls", "{data.chatId}"), (doc) => {
      if (doc.data() != null) {
        callInput.value = data.chatId;
      }
    }
    )
  }


  const callButtonClicked = async () => {
    // referencing firebase collections
    console.log("callButtonClicked")
    await setDoc(doc(db, "calls", data.chatId),{"offerCandidates":null, "answerCandidates":null});
    console.log(data.chatId);
    const callRef = doc(db, "calls", data.chatId);
    console.log(callRef);
    // setting the input value to the callRef id
    callInput.value = data.chatId
    // get candidiates for caller and save to db
    pc.onicecandidate = async event => {
        event.candidate && await updateDoc(callRef, {offerCandidates:event.candidate.toJSON()});
    }
    // create offer
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
    // config for offer
    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type
    }
    await updateDoc(callRef,{offer : offer});
    // listening to changes in firestore and update the streams accordingly
    const unsub = onSnapshot(callRef, (snapshot) => {
        const data = snapshot.data();
        if (data == null) {
          return;
        }
        if (!pc.currentRemoteDescription && data.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
        // if answered add candidates to peer connection
        const q = query(collection(db, "calls"), where("__name__","==", "{data.chatId}"))
        const answerSub = onSnapshot(q, snapshot => {
          console.log(snapshot)
            if (snapshot != null) {
              console.log(snapshot);
              snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    pc.addIceCandidate(candidate);
                }
              })}
        })
    })
    hangupButton.disabled = false;
  }

  const answerButtonClicked = async () => {
    console.log("answerbuttonClicked")
    const callId = callInput.value;
    // getting the data for this particular call
    const callRef = doc(db, "calls", callId);            
    // here we listen to the changes and add it to the answerCandidates
    pc.onicecandidate = async event => {
        event.candidate && await updateDoc(callRef, {answerCandidates:event.candidate.toJSON()});
    }
    const callData = ((await getDoc(callRef)).data());
    // setting the remote video with offerDescription
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
    // setting the local video as the answer
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(new RTCSessionDescription(answerDescription));
    // answer config
    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
    }
    const prevofferCandidates = callData.offerCandidates
    await updateDoc(callRef,{answer : answer});
    const q = query(collection(db, "calls"), where("__name__","==", "{callId}"))
    onSnapshot(q, snapshot => {
        if (snapshot == null) {
          return;
        }
        console.log(snapshot);
        snapshot.docChanges().forEach(change => {
            if (change.type === 'added') {
                let data = change.doc.data();
                pc.addIceCandidate(new RTCIceCandidate(data));
            }
        })
    })
  }
  useEffect(() => {
    webcamVideo = document.querySelector('#webcamVideo');
    callButton = document.querySelector('#callButton');
    callInput = document.querySelector('#callInput');
    answerButton = document.querySelector('#answerButton');
    remoteVideo = document.querySelector('#remoteVideo');
    hangupButton = document.querySelector('#hangupButton');
    videoClicked();
    monitorIncomingCall();
    console.log("localStream = " + localStream);
    console.log("remotestream = " + remoteStream);
  },[]
  )
    

  return (
    <div>
      <video id="webcamVideo" autoPlay playsInline></video>
      <video id="remoteVideo" autoPlay playsInline></video>
      <button onClick={callButtonClicked} id="callButton">Create Call (offer)</button>
      <input id="callInput" />
      <button onClick={answerButtonClicked} id="answerButton" >Answer</button>
      <button id="hangupButton" >Hangup</button>
    </div>
  )
}

export default Video