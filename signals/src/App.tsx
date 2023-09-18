import { useEffect, useState } from "react";
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

import {ActionReceiver, ActionSender, joinRoom} from 'trystero';

function App() {
  const [user, _setUser] = useState<User | undefined>();
  const [state, setState] = useState<string[]>([]);
  const [channel, setChannel] = useState<[ActionSender<string>, ActionReceiver<string>]>();

  useEffect(() => {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    getDatabase(app);
    getAuth(app).setPersistence(browserSessionPersistence);

    // signInAnonymously(getAuth()).then((u) => setUser(u.user));

    const room = joinRoom({appId: firebaseConfig.appId}, "asd");
    console.log(room, room.getPeers());
    const [senddrink,ondrink] = room.makeAction<string>('drink');
    setChannel([senddrink,ondrink]);
    ondrink((data, peerId) => {
      setState(prev => [...prev, JSON.stringify(data)])
      console.log("got", peerId, data);
    });
    room.onPeerJoin((peerId:string) => console.log("joined", peerId));
    room.onPeerLeave((peerId:string) => console.log("joined", peerId));
    room.onPeerStream((stream, peerId, metadata) => console.log("on stream", peerId, stream, metadata));
    room.onPeerTrack((track,stream, peerId) => console.log("on track", peerId, stream, track));

    return () => {
      console.log("cleanup");
      // const app = getApp();
      // deleteApp(app);
      room.leave();

      // peerConnection.close();
    };
  }, []);
  // useEffect(() => {
  //   if (channel) channel.onmessage = (e) => console.log("message", e);
  // }, [channel]);

  return (
    <>
      <h1>{user?.uid?.substring(0, 7)}</h1>
      <div className="card">
      <button onClick={() => channel![0]('mezcal')}>
          Join
        </button>
        <ul>
        {state.map((x, i) => <li key={i+x}>{x}</li>)}
        </ul>
        {/* <button onClick={() => create()}>
          Create
        </button>

        <button onClick={() => join()}>
          Join
        </button> */}
        {/* <span>{state}</span>
        {state === "connected" && (
          <button onClick={() => channel?.send("test")}>send</button>
        )} */}
      </div>
    </>
  );
}

export default App;
