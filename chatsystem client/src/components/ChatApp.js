import React, { useEffect, useState } from 'react'
import { over } from 'stompjs';
import SockJS from 'sockjs-client';

var stompClient = null;
function ChatApp()
{
    const [publicRoom, setPublicRoom] = useState([]);
    const [notificationTab, setNotificationTab] = useState(new Map());
    const [privateRooms, setPrivateRooms] = useState(new Map());
    const [tab, setTab] = useState("CHATAPP");
    const [isValidUsername, setIsValidUsername] = useState(true);
    const [userData, setUserData] = useState({
        userName: '',
        receiverName: '',
        isConnected: false,
        userMessage: ''
    });
    useEffect(() => {
        //console.log(userData);
    }, [userData]);

    useEffect(() => {
        notificationTab.set("CHATAPP", 0);
    }, [])

    function connectToServer()
    {
        let Sock = new SockJS('http://localhost:8080/ws');
        stompClient = over(Sock);
        stompClient.debug = null;
        stompClient.connect({}, onConnectedToServer, onError);
    }
    
    function onConnectedToServer()
    {
        setUserData({ ...userData, "isConnected": true });
        stompClient.subscribe('/chatapp/public', onPublicMessageSent);
        stompClient.subscribe('/user/' + userData.userName + '/private', onPrivateMessageSent);
        onUserJoin();
    }

    function onUserJoin()
    {
        var msg = {
            senderName: userData.userName,
            messageStatus: "JOIN"
        };
        stompClient.send("/app/message", {}, JSON.stringify(msg));
    }

    function onPublicMessageSent(message)
    {
        var messageData = JSON.parse(message.body);
        switch (messageData.messageStatus)
        {
            case "JOIN":
                if (!privateRooms.get(messageData.senderName))
                {
                    privateRooms.set(messageData.senderName, []);
                    setPrivateRooms(new Map(privateRooms));
                    notificationTab.set(messageData.senderName, 0);

                    stompClient.send("/app/message", {}, JSON.stringify({
                        senderName: userData.userName,
                        messageStatus: "JOIN"
                    }));
                }
                break;
            case "MESSAGE":
                publicRoom.push(messageData);
                setPublicRoom([...publicRoom]);

                if(messageData.senderName !== userData.userName)
                {
                    notificationTab.set("CHATAPP", parseInt(notificationTab.get("CHATAPP")) + 1)
                    setNotificationTab(new Map(notificationTab));
                }
                break;
        }
    }

    function onPrivateMessageSent(message)
    {
        //console.log(message);
        var messageData = JSON.parse(message.body);

        if (privateRooms.get(messageData.senderName))
        {
            privateRooms.get(messageData.senderName).push(messageData);
            setPrivateRooms(new Map(privateRooms));
        }
        else
        {
            let messageList = [];
            messageList.push(messageData);
            privateRooms.set(messageData.senderName, messageList);
            setPrivateRooms(new Map(privateRooms));
        }

        notificationTab.set(messageData.senderName, parseInt(notificationTab.get(messageData.senderName)) + 1)
        setNotificationTab(new Map(notificationTab));
    }

    function onError (err)
    {
        console.log(err);
    }

    function handleMessage(event)
    {
        const { value } = event.target;
        setUserData({ ...userData, "userMessage": value });
    }

    function SendPublicMessage()
    {
        if (!stompClient) return;

        var msg = {
            senderName: userData.userName,
            message: userData.userMessage,
            messageStatus: "MESSAGE"
        };
        //console.log(msg);
        stompClient.send("/app/message", {}, JSON.stringify(msg));
        setUserData({ ...userData, "userMessage": "" });
    }

    function SendPrivateMessage()
    {
        if (!stompClient) return;

        var msg = {
            senderName: userData.userName,
            receiverName: tab,
            message: userData.userMessage,
            messageStatus: "MESSAGE"
        };

        if (userData.userName !== tab)
        {
            privateRooms.get(tab).push(msg);
            setPrivateRooms(new Map(privateRooms));
        }
        stompClient.send("/app/private-message", {}, JSON.stringify(msg));
        setUserData({ ...userData, "userMessage": "" });
    }

    function handleUsername (event)
    {
        const { value } = event.target;
        setUserData({ ...userData, "userName": value });
    }

    function registerUser ()
    {
        if(userData.userName.length > 0)
        {
            connectToServer();
            setIsValidUsername(true)
        }
        else
        {
            //alert("Lütfen isminizi giriniz.")
            setIsValidUsername(false)
        }
    }

    return (
        <div className="container">
            {userData.isConnected ?
                <div className="chatWindow">
                    <div className="users">
                        <ul>
                            <li onClick={() => { setTab("CHATAPP"); notificationTab.set("CHATAPP", 0) }} className={`user ${tab === "CHATAPP" && "active"}`}>PUBLIC {parseInt(notificationTab.get("CHATAPP")) > 0 ? notificationTab.get("CHATAPP") : null}</li>
                            {[...privateRooms.keys()].map((name, index) =>
                                userData.userName !== name ? <li onClick={() => { setTab(name); notificationTab.set(name, 0) }} className={`user ${tab === name && "active"}`} key={index}>{name} {userData.userName === name ? " (YANİ BEN)": null} {parseInt(notificationTab.get(name)) > 0 ? notificationTab.get(name) : null}</li>: null
                            )}
                        </ul>
                    </div>
                    {tab === "CHATAPP" && <div className="chatContent">
                        <ul className="chatMessages">
                            {publicRoom.map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.userName && "self"}`} key={index}>
                                    {chat.senderName !== userData.userName && <div className="profilePicture">{chat.senderName}</div>}
                                    <div className="messageLine">{chat.message}</div>
                                    {chat.senderName === userData.userName && <div className="profilePicture self">{chat.senderName}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="sendMessage">
                            <input type="text" className="inputMessage" placeholder="enter the message" value={userData.userMessage} onChange={handleMessage} />
                            <button type="button" className="sendButton" onClick={SendPublicMessage}>send</button>
                        </div>
                    </div>}
                    {tab !== "CHATAPP" && <div className="chatContent">
                        <ul className="chatMessages">
                            {[...privateRooms.get(tab)].map((chat, index) => (
                                <li className={`message ${chat.senderName === userData.userName && "self"}`} key={index}>
                                    {chat.senderName !== userData.userName && <div className="profilePicture">{chat.senderName}</div>}
                                    <div className="messageLine">{chat.message}</div>
                                    {chat.senderName === userData.userName && <div className="profilePicture self">{chat.senderName}</div>}
                                </li>
                            ))}
                        </ul>

                        <div className="sendMessage">
                            <input type="text" className="inputMessage" placeholder="enter the message" value={userData.userMessage} onChange={handleMessage} />
                            <button type="button" className="sendButton" onClick={SendPrivateMessage}>send</button>
                        </div>
                    </div>}
                </div>
                :
                <div className="register">
                    <input
                        id="user-name"
                        placeholder="Enter your name"
                        name="userName"
                        value={userData.userName}
                        onChange={handleUsername}
                        margin="normal"
                    />
                    <button type="button" onClick={registerUser}>
                        connect
                    </button>
                    {!isValidUsername ? <span>GARDAŞ önce ismini yaz sonra gir, uğraştırma</span> : null}
                </div>}

        </div>
    )
}

export default ChatApp