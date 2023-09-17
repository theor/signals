import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
import { deleteApp, getApp, initializeApp } from "firebase/app";
import {
  browserSessionPersistence,
  getAuth,
  signInAnonymously,
  User,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAite-peeC9kkgfs_KgcbbLZ-G4K5Aa-VU",
  authDomain: "signals-10b17.firebaseapp.com",
  databaseURL: "https://signals-10b17-default-rtdb.firebaseio.com",
  projectId: "signals-10b17",
  storageBucket: "signals-10b17.appspot.com",
  messagingSenderId: "715260614346",
  appId: "1:715260614346:web:63433ff1bdcb1099edc633",
};

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
    console.log(`ICE gathering state changed: ${conn.iceGatheringState}`);
  });

  conn.addEventListener("connectionstatechange", () => {
    console.log(`Connection state change: ${conn.connectionState}`);
    setState(conn.connectionState);
  });

  conn.addEventListener("signalingstatechange", () => {
    console.log(`Signaling state change: ${conn.signalingState}`);
  });

  conn.addEventListener("iceconnectionstatechange ", () => {
    console.log(`ICE connection state change: ${conn.iceConnectionState}`);
  });
}
const roomPath = "rooms/-NeTabnqkcYVitHHTaj8";
let peerConnection: RTCPeerConnection;

// interface Connection {
//   state: RTCPeerConnectionState;
//   setState: Dispatch<SetStateAction<RTCPeerConnectionState>>;

// }

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
    if (/* !conn.currentRemoteDescription && */ data) {
      console.log("Got remote description: ", data);
      const rtcSessionDescription = new RTCSessionDescription(data);
      if (conn.currentRemoteDescription) {
        console.warn("clear remote desc");
        conn.restartIce();
      }
      await conn.setRemoteDescription(rtcSessionDescription);
    }
  });

  onChildAdded(ref(db, roomPath + "/calleeCandidates"), async (snapshot) => {
    const data = snapshot.val();
    console.log("callee candidate added", data);
  });
  return sendChannel;
};

const join = async (conn: RTCPeerConnection) => {
  const db = getDatabase();
  const roomRef = ref(db, roomPath);
  const room = await get(ref(db, "rooms/-NeTabnqkcYVitHHTaj8"));
  if (!room.exists()) {
    console.error("room doesnt exist");
    return Promise.reject("room doesnt exist");
  }

  return new Promise<RTCDataChannel>(async (resolve, reject) => {
    conn.ondatachannel = (e) => {
      console.log("on datachannel", e);
      resolve(e.channel);
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
  });
};

function App() {
  const [user, setUser] = useState<User | undefined>();
  const [state, setState] = useState<RTCPeerConnectionState>("closed");
  const [channel, setChannel] = useState<RTCDataChannel>();

  useEffect(() => {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    getDatabase(app);
    getAuth(app).setPersistence(browserSessionPersistence);

    signInAnonymously(getAuth()).then((u) => setUser(u.user));

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
    if (channel) channel.onmessage = (e) => console.log("message", e);
  }, [channel]);

  return (
    <>
      <h1>{user?.uid?.substring(0, 7)}</h1>
      <div className="card">
        <button onClick={() => create(peerConnection).then(setChannel)}>
          Create
        </button>

        <button onClick={() => join(peerConnection).then(setChannel)}>
          Join
        </button>
        <span>{state}</span>
        {state === "connected" && (
          <button onClick={() => channel?.send("test")}>send</button>
        )}
      </div>
    </>
  );
}

export default App;
