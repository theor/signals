import { useEffect, useState } from "react";
import "./App.css";
import P2PT, { Peer } from "p2pt";

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

interface Connection {
  p2pt: P2PT,
  peers: Map<string, Peer>;
}

// import { ActionReceiver, ActionSender, joinRoom } from "trystero/firebase";

function App() {
  const [connected, setConnected] = useState(false);
  const [hasPeers, setHasPeers] = useState(0);
  const [user, _setUser] = useState<User | undefined>();
  const [messages, setMessages] = useState<string[]>([]);
  const [p2pt, setP2pt] = useState<Connection>()
  // const [channel, setChannel] = useState<(msg: any) => void>();
  //   useState<[ActionSender<string>, ActionReceiver<string>]>();

  useEffect(() => {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);

    getDatabase(app);
    getAuth(app).setPersistence(browserSessionPersistence);

    // signInAnonymously(getAuth()).then((u) => setUser(u.user));

    let announceURLs = [
      "wss://tracker.webtorrent.dev",
      "wss://tracker.btorrent.xyz",
      "wss://tracker.openwebtorrent.com",
      // "wss://tracker.sloppyta.co:443/announce",
      // "wss://tracker.novage.com.ua:443/announce",
      // "wss://tracker.btorrent.xyz:443/announce",
    ];
    if (window.location.hostname === "localhost") {
      announceURLs = ["ws://localhost:5000"];
    }

    let peers = new Map<string, Peer>();
    let p2pt = new P2PT(announceURLs, "signals/" + firebaseConfig.appId);

    p2pt.on("trackerconnect", (e, stats) => {
      console.log("tracker connect", e, stats);
      setConnected(stats.connected > 0);
    });
    p2pt.on("trackerwarning", (e, stats) =>{
      // console.warn("tracker warning", e, stats)
      setConnected(stats.connected > 0);
    });
    p2pt.on("peerconnect", (e) => {
      peers.set(e.id, e);
      console.log("peerconnect", e);
      setHasPeers(peers.size);
    });
    p2pt.on("peerclose", (e) => {
      peers.delete(e.id);
      console.log("peerclose", e);
      setHasPeers(peers.size);

    });
    // p2pt.on("data", console.warn);
    p2pt.on("msg", (p, msg) => {
      setMessages((prev) => [...prev, JSON.stringify(msg)]);
      return console.log(msg, p);
    });
    p2pt.start();
    setP2pt({p2pt: p2pt, peers: peers});
    console.log("this", p2pt._peerId);

    const interval = setInterval(() => p2pt.requestMorePeers(), 3000);

    return () => {
      console.log("cleanup");
      clearInterval(interval);
      p2pt.destroy();
      // const app = getApp();
      // deleteApp(app);
      // room.leave();

      // peerConnection.close();
    };
  }, []);

  const send = (x: any) => {
    if(!p2pt) return;
        console.log("send", p2pt.peers);

        for (const peer of p2pt.peers) {
          p2pt.p2pt.send(peer[1], p2pt.p2pt._peerId + ":" + x);
        }
      };
  // useEffect(() => {
  //   if (channel) channel.onmessage = (e) => console.log("message", e);
  // }, [channel]);

  return (
    <>
      <h1>{user?.uid?.substring(0, 7)}</h1>
      <div className="card">
        <span>{connected ? "connected" : "disconnected"}</span>
        <span>{connected && <>{hasPeers} peers</>}</span>
        <button
          onClick={() => {
            p2pt && send("test");
          }}
        >
          Send
        </button>
        <ul>
          {messages.map((x, i) => (
            <li key={i + x}>{x}</li>
          ))}
        </ul>
        <button
          onClick={() => {
            p2pt && p2pt.p2pt.requestMorePeers();
          }}
        >
          Refresh peers
        </button>
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
