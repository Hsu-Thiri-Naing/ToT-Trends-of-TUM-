// src/components/chat/Chat.jsx
import React, { useState, useEffect, useRef } from "react";
import apiClient from "../../api/apiClient";
import UserAvatar from "../common/UserAvatar";
import "./Chat.css";

const Chat = ({
  currentUserId,
  otherUserId,
  otherUserName,
  otherUserAvatar,
  onViewProfile,
  isOtherUserOnline,
  socket,
  onBackToUserList,
}) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyError, setHistoryError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(Boolean(socket?.connected));
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!loadingHistory) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingHistory]);

  useEffect(() => {
    const controller = new AbortController();
    apiClient.get("/messages/" + otherUserId, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setMessages((current) => {
          const historyIds = new Set(data.map((message) => message.id));
          return [...data, ...current.filter((message) => !historyIds.has(message.id))];
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) setHistoryError("Could not load earlier messages.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingHistory(false);
      });
    return () => controller.abort();
  }, [otherUserId]);

  useEffect(() => {
    if (!socket) return;

    const appendMessage = (message) => {
      const incoming = message.sender_id === otherUserId && message.recipient_id === currentUserId;
      const outgoing = message.sender_id === currentUserId && message.recipient_id === otherUserId;
      if (!incoming && !outgoing) return;
      setMessages((current) =>
        current.some((item) => item.id === message.id) ? current : [...current, message]
      );
    };
    const handleSent = (message) => {
      if (message.sender_id !== currentUserId || message.recipient_id !== otherUserId) return;
      appendMessage(message);
      setNewMessage("");
      setSending(false);
      setSendError(null);
    };
    const handleError = ({ error }) => {
      setSending(false);
      setSendError(error || "Could not send the message. Try again.");
    };
    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => {
      setConnected(false);
      setSending(false);
    };

    setConnected(socket.connected);
    socket.on("receiveMessage", appendMessage);
    socket.on("messageSent", handleSent);
    socket.on("messageError", handleError);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    return () => {
      socket.off("receiveMessage", appendMessage);
      socket.off("messageSent", handleSent);
      socket.off("messageError", handleError);
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, currentUserId, otherUserId]);

  const handleSendMessage = () => {
    const content = newMessage.trim();
    if (!content || !socket?.connected || sending) return;
    setSending(true);
    setSendError(null);
    socket.emit("sendMessage", {
      sender_id: currentUserId,
      recipient_id: otherUserId,
      content,
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Use the provided name or fallback
  const displayName = otherUserName || `User ${otherUserId || "Unknown"}`;

  return (
    <section className="view-enter container w-full mx-auto order-2 lg:flex-8 rounded-3xl h-[calc(100dvh-135px)] lg:h-[calc(100vh-35px)] lg:mr-4 my-0 lg:my-4 bg-[#5978A433] font-balthazar py-2 lg:py-4 px-1 sm:px-2 lg:px-4 min-w-0 flex flex-col">
      <div className="chat-container boxshadow rounded-3xl sm:rounded-4xl px-3 sm:px-7 pt-4 pb-3 mx-auto flex flex-col gap-2 w-full h-full">
        {/* Chat Header */}
        <div className="chat-header flex items-center gap-3 border-b-2 border-b-cyan-50/70 pb-3 flex-none">
          {/* Mobile Back Button */}
          {onBackToUserList && (
            <button
              onClick={onBackToUserList}
              className="lg:hidden text-2xl text-[#646cff] font-bold p-1 -ml-1 cursor-pointer"
              title="Back"
              aria-label="Back"
            >
              ←
            </button>
          )}

          <div className="profile-avatar relative flex-shrink-0">
            <UserAvatar
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover"
              src={otherUserAvatar || otherUserId?.avatar}
              alt={`${displayName}'s avatar`}
            />
            {/* Display Online Status */}
            <span
              className={`online-status-chat ${
                isOtherUserOnline ? "online" : "offline"
              }`}
            >
              <span
                className={`status-text-chat text-sm absolute -right-2 -bottom-1 text-white px-2 rounded-lg ${
                  isOtherUserOnline ? "bg-green-500/78 " : "bg-gray-400/78 "
                }`}
              >
                {isOtherUserOnline ? "Here" : "Out"}
              </span>
            </span>
          </div>

          <span
            onClick={() => {
              if (onViewProfile && otherUserId) {
                onViewProfile(
                  typeof otherUserId === "object"
                    ? otherUserId.id
                    : otherUserId,
                );
              }
            }}
            className="cursor-pointer text-2xl sm:text-3xl text-[#646cff] chicle-regular leading-none truncate"
          >
            {displayName}
          </span>
        </div>

        {/* Message List */}
        <div className="chat-messages-container no-scrollbar flex-1 overflow-y-auto py-2">
          {loadingHistory ? (
            <div className="chat-placeholder font-balthazar text-lg my-auto text-center">
              Loading messages...
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const isCurrentUser =
                msg.sender_id == currentUserId ||
                (msg.sender && msg.sender.id == currentUserId);
              return (
                <div
                  key={msg.id}
                  className={`message-bubble boxshadow ${
                    isCurrentUser ? "message-outgoing" : "message-incoming"
                  }`}
                >
                  <div className="text-black">{msg.content}</div>
                  <span className="message-timestamp text-black">
                    {new Date(
                      msg.created_at || Date.now(),
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="chat-placeholder font-balthazar text-lg my-auto text-center">
              <i>Start the conversation with {displayName}...</i>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {(sendError || historyError || !connected) && (
          <p role="status" className="text-sm text-blue-950">
            {sendError || historyError || "Connecting to chat..."}
          </p>
        )}

        {/* Input Area */}
        <div className="chat-input-area boxshadow py-2 px-3 rounded-2xl flex items-center justify-between gap-2 flex-none mt-auto">
          <input
            className="outline-0 w-full bg-transparent text-black"
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={`Message ${displayName}...`}
            readOnly={sending}
            maxLength={5000}
          />

          <button
            className="send-btn w-6 h-6 bg-[url('/assets/images/send.png')] bg-cover bg-center cursor-pointer hover:bg-[url('/assets/images/sends.png')] hover:scale-105 duration-300 flex-shrink-0 disabled:opacity-40"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !connected || sending}
            aria-label="Send"
          ></button>
        </div>
      </div>
    </section>
  );
};

export default Chat;
