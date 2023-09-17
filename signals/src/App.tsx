import { Dispatch, SetStateAction, useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import {
  get,
  getDatabase,
  onChildAdded,
  onValue,
  push,
  ref,
  set,
  update,
} from "firebase/database";
import { deleteApp, getApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from "firebase/auth";

const configuration = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};
function registerPeerConnectionListeners(
  conn: RTCPeerConnection,
  setState: (s: RTCPeerConnectionState) => void
) {
  conn.addEventListener("icegatheringstatechange", () => {
    console.log(
      `ICE gathering state changed: ${conn.iceGatheringState}`
    );
  });

  conn.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${conn.connectionState}`);
    setState(conn.connectionState);
  });

  conn.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${conn.signalingState}`);
  });

  conn.addEventListener("iceconnectionstatechange ", () => {
    console.log(
      `ICE connection state change: ${conn.iceConnectionState}`
    );
  });
}
const roomPath = "rooms/-NeTabnqkcYVitHHTaj8";
let peerConnection: RTCPeerConnection;

// interface Connection {
//   state: RTCPeerConnectionState;
//   setState: Dispatch<SetStateAction<RTCPeerConnectionState>>;

// }

function App() {
  const [state, setState] = useState<RTCPeerConnectionState>("closed");
  const [channel, setChannel] = useState<RTCDataChannel>();
  const create = async (conn: RTCPeerConnection) => {
    const db = getDatabase();
    const roomRef = ref(db, roomPath);
    await set(roomRef, { name: "asd", users: [] });

    let sendChannel = conn.createDataChannel("sendChannel");
    let handleSendChannelStatusChange = (x: any) => {
      console.log("sendchannel change", x);
    };
    sendChannel.onopen = handleSendChannelStatusChange;
    sendChannel.onclose = handleSendChannelStatusChange;
    setChannel(sendChannel);
    conn.addEventListener("icecandidate", (event) => {
      if (!event.candidate) {
        console.log("Got final candidate!");
        return;
      }
      console.log("Got candidate: ", event.candidate);
      set(
        push(ref(db, roomPath + "/callerCandidates")),
        event.candidate.toJSON()
      );
    });

    const offer = await conn.createOffer();
    await conn.setLocalDescription(offer);
    console.log("Created offer:", offer);

    const roomWithOffer = {
      offer: {
        type: offer.type,
        sdp: offer.sdp,
      },
    };
    await update(roomRef, roomWithOffer);

    conn.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        // remoteStream.addTrack(track);
      });
    });
    onValue(ref(db, roomPath + "/answer"), async (snapshot) => {
      const data = snapshot.val();
      console.log("on value", data);
      if (!conn.currentRemoteDescription && data) {
        console.log("Got remote description: ", data);
        const rtcSessionDescription = new RTCSessionDescription(data);
        await conn.setRemoteDescription(rtcSessionDescription);
      }
    });

    onChildAdded(ref(db, roomPath + "/calleeCandidates"), async (snapshot) => {
      const data = snapshot.val();
      console.log("callee candidate added", data);
    });
  };

  const join = async (conn: RTCPeerConnection) => {
    const db = getDatabase();
    const roomRef = ref(db, roomPath);
    const room = await get(ref(db, "rooms/-NeTabnqkcYVitHHTaj8"));
    if (!room.exists()) {
      console.error("room doesnt exist");
    }

    conn.ondatachannel = (e) => {
      console.log("on datachannel", e);
      setChannel(e.channel);
    };
    conn.addEventListener("icecandidate", (event) => {
      if (!event.candidate) {
        console.log("Got final candidate!");
        return;
      }
      console.log("Got candidate: ", event.candidate);
      set(
        push(ref(db, roomPath + "/calleeCandidates")),
        event.candidate.toJSON()
      );
    });

    conn.addEventListener("track", (event) => {
      console.log("Got remote track:", event.streams[0]);
      event.streams[0].getTracks().forEach((track) => {
        console.log("Add a track to the remoteStream:", track);
        // remoteStream.addTrack(track);
      });
    });

    const offer = room.val().offer;
    console.log("Got offer:", offer);
    await conn.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await conn.createAnswer();
    console.log("Created answer:", answer);
    await conn.setLocalDescription(answer);

    const roomWithAnswer = {
      answer: {
        type: answer.type,
        sdp: answer.sdp,
      },
    };
    await update(roomRef, roomWithAnswer);

    onChildAdded(ref(db, roomPath + "/callerCandidates"), async (snapshot) => {
      const data = snapshot.val();
      console.log("on value", data);
      await conn.addIceCandidate(new RTCIceCandidate(data));
    });
  };

  useEffect(() => {
    peerConnection = new RTCPeerConnection(configuration);
    registerPeerConnectionListeners(peerConnection, setState);

    return () => {
      console.log("cleanup");
      const app = getApp();
      deleteApp(app);

      peerConnection.close();
    };
  }, []);
  useEffect(() => {
    if(channel)
    channel.onmessage = e => console.log("message", e);
  }, [channel]);

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
        <button onClick={() => create(peerConnection)}>Create</button>

        <button onClick={() => join(peerConnection)}>Join</button>
        <span>{state}</span>
        {state === "connected" && <button onClick={() => channel?.send("test")}>send</button>}
      </div>
    </>
  );
}

export default App;
