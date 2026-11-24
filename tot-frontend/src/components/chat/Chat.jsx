import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { LuArrowLeft, LuSend } from "react-icons/lu";
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
  const messageList = useRef(null);

  useLayoutEffect(() => {
    const list = messageList.current;
    if (!loadingHistory && list) list.scrollTop = list.scrollHeight;
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

  const handleSendMessage = (event) => {
    event.preventDefault();
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

  const displayName = otherUserName || `User ${otherUserId || "Unknown"}`;
  const status = isOtherUserOnline ? "Online" : "Offline";

  return (
    <section className="chat-view view-enter order-2 lg:flex-8" aria-label="Conversation">
      <div className="chat-container liquid-glass">
        <header className="chat-conversation-header">
          {onBackToUserList && (
            <button
              type="button"
              onClick={onBackToUserList}
              className="chat-back glass-lens"
              aria-label="Back to Trendmates"
            >
              <LuArrowLeft aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="chat-participant"
            onClick={() => onViewProfile?.(otherUserId)}
            aria-label={`View profile of ${displayName}`}
            aria-describedby="chat-presence"
          >
            <span className="chat-avatar glass-lens">
              <UserAvatar src={otherUserAvatar} alt="" width="44" height="44" />
            </span>
            <span className="chat-participant-details">
              <strong className="chat-participant-name">{displayName}</strong>
              <span className="chat-presence" id="chat-presence" data-online={Boolean(isOtherUserOnline)}>
                {status}
              </span>
            </span>
          </button>
        </header>

        <div
          className="chat-messages-container"
          ref={messageList}
          role="log"
          aria-label={`Messages with ${displayName}`}
          aria-busy={loadingHistory}
          tabIndex={0}
        >
          {loadingHistory ? (
            <p className="chat-placeholder">Loading messages…</p>
          ) : messages.length > 0 ? (
            messages.map((message) => {
              const outgoing = String(message.sender_id ?? message.sender?.id) === String(currentUserId);
              return (
                <div
                  key={message.id}
                  className={`message-bubble ${outgoing ? "message-outgoing" : "message-incoming"}`}
                >
                  <p>{message.content}</p>
                  <span className="message-timestamp">
                    {new Date(message.created_at || Date.now()).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          ) : !historyError && (
            <p className="chat-placeholder">Start a conversation with {displayName}.</p>
          )}
        </div>

        {(sendError || historyError || !connected) && (
          <p role="status" className="chat-status">
            {sendError || historyError || "Connecting to chat…"}
          </p>
        )}

        <form className="chat-input-area glass-lens glass-responsive" onSubmit={handleSendMessage}>
          <input
            type="text"
            name="message"
            aria-label={`Message ${displayName}`}
            value={newMessage}
            onChange={(event) => setNewMessage(event.target.value)}
            placeholder={`Message ${displayName}…`}
            autoComplete="off"
            readOnly={sending}
            maxLength={5000}
          />
          <button
            type="submit"
            className="send-btn glass-primary"
            disabled={!newMessage.trim() || !connected || sending}
            aria-label="Send message"
          >
            <LuSend aria-hidden="true" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default Chat;
