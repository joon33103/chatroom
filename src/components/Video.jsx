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
    // initalizing the remote server to the mediastream
    remoteStream = new MediaStream();
    // Pushing tracks from local stream to peerConnection
    localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
    })
    pc.ontrack = event => {
        event.streams[0].getTracks(track => {
            remoteStream.addTrack(track)
            console.log("Add track to remoteStream : " + track)
        })
    }  
    // displaying the video data from the stream to the webpage
    webcamVideo.srcObject = localStream;
    remoteVideo.srcObject = remoteStream;
    registerPeerConnectionListeners();

    
  }
  const registerPeerConnectionListeners = () => {
    pc.addEventListener('icegatheringstatechange', () => {
      console.log(
          `ICE gathering state changed: ${pc.iceGatheringState}`);
    });
  
    pc.addEventListener('connectionstatechange', () => {
      console.log(`Connection state change: ${pc.connectionState}`);
    });
  
    pc.addEventListener('signalingstatechange', () => {
      console.log(`Signaling state change: ${pc.signalingState}`);
    });
  
    pc.addEventListener('iceconnectionstatechange ', () => {
      console.log(
          `ICE connection state change: ${pc.iceConnectionState}`);
    });
  }
  
  //returns true if firebase calls collection contains an existing doc with id "chatId"
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

  // when called, creates real-time monitor of the calls collection for the doc with id chatId
  // and sets the value of callInput in the UI to chatId
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
    await setDoc(doc(db, "calls", data.chatId), {offer : null, answer : null});
    const callRef = doc(db, "calls", data.chatId);
    const offerCandidates = collection(callRef, "offerCandidates");
    const answerCandidates = collection(callRef, "answerCandidates");
    console.log(data.chatId);

    console.log(callRef);
    // setting the input value to the callRef id
    callInput.value = data.chatId
    // get candidiates for caller and save to db
    pc.onicecandidate = async event => {
        event.candidate && await addDoc(offerCandidates, event.candidate.toJSON());
        if (!event.candidate) {
          console.log("got final candidate");
        }
        console.log('Got candidate: ' + event.candidate)
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
    // listening to changes in calls collection. If there is data in the answer field and the peerConnection has no remotedescription,
    // set this answer to the remotedescription
    const unsub = onSnapshot(callRef, async (snapshot) => {
        const data = snapshot.data();
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            await pc.setRemoteDescription(answerDescription);
        }
    })
    // if there are candidates added to answerCandidates, add these as icecandidates to the peer connection
    const answerSub = onSnapshot(answerCandidates, snapshot => {
      snapshot.docChanges().forEach(async change => {
        if (change.type === 'added') {
            const candidate = new RTCIceCandidate(change.doc.data());
            console.log("Got new remote ice candidate : " + candidate);
            await pc.addIceCandidate(candidate).catch((e) => {
              console.log("addIcecandidateerror = " + e)
            })
          }
        }
      )
      })
    pc.addEventListener('connectionstatechange', event => {
      if (pc.connectionState === 'connected') {
          console.log("peers connected")
      }
  });
  }

  const answerButtonClicked = async () => {
    console.log("answerbuttonClicked")
    const callId = callInput.value;
    // getting the data for this particular call
    const callRef = doc(db, "calls", callId);   
    const answerCandidates = collection(callRef, "answerCandidates"); 
    const offerCandidates = collection(callRef, "offerCandidates");
    const callSnapshot = await getDoc(callRef);
    console.log("Got room: " + callSnapshot.exists);   
    // listen to changes in peer connection icecandidates and add them to answerCandidates in the firebase db
    pc.onicecandidate = async event => {
        event.candidate && await addDoc(answerCandidates, event.candidate.toJSON());
        if (!event.candidate) {
          console.log("Got final candidate (logged by answerbutton)")
        }
        console.log("(logged from answerbutton)Got candidate: " + event.candidate);
    }
    const callData = ((await getDoc(callRef)).data());
    // setting the remote video with offerDescription
    const offerDescription = callData.offer;
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
    // setting the local video as the answer
    const answerDescription = await pc.createAnswer();
    console.log("created answer: " + answerDescription)
    await pc.setLocalDescription(new RTCSessionDescription(answerDescription));
    // answer config
    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp
    }
    await updateDoc(callRef,{answer : answer});
    onSnapshot(offerCandidates, snapshot => {
        snapshot.docChanges().forEach(async change => {
            if (change.type === 'added') {
              console.log("(logged from answerbutton) got new remote ice cand: " + change.doc.data());
                await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
            }
        })
    })
    pc.addEventListener('connectionstatechange', event => {
      if (pc.connectionState === 'connected') {
          console.log("peers connected")
      }
  });
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
    return() => {
      videoClicked();
      monitorIncomingCall();
    }
  }
  ,[]
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