// @ts-check
import React, { useMemo } from "react";
import { getAvatarByUserAndRoomId } from "../../../../../utils";
import ChatIcon from "./ChatIcon";

const AvatarImage = ({ name, id }) => {
  // Determine if this is a channel or direct message
  const isChannel = id === "0" || !String(id).includes(":");
  const isDirectMessage = String(id).includes(":") && id !== "0";
  
  const url = useMemo(() => {
    // Only generate avatar URL for direct messages
    if (!isDirectMessage) return null;
    
    const av = getAvatarByUserAndRoomId("" + id);
    if (name === "Mary") {
      return `${process.env.PUBLIC_URL}/avatars/0.jpg`;
    } else if (name === "Pablo") {
      return `${process.env.PUBLIC_URL}/avatars/2.jpg`;
    } else if (name === "Joe") {
      return `${process.env.PUBLIC_URL}/avatars/9.jpg`;
    } else if (name === "Alex") {
      return `${process.env.PUBLIC_URL}/avatars/8.jpg`;
    }
    return av;
  }, [id, name, isDirectMessage]);

  return (
    <>
      {isChannel ? (
        // All channels (including General) use chat bubble icon
        <div className="overflow-hidden rounded-circle">
          <ChatIcon />
        </div>
      ) : (
        // Direct messages show the other person's profile picture
        <img
          src={url}
          alt={name}
          style={{ width: 32, height: 32, objectFit: "cover" }}
          className="rounded-circle avatar-xs"
        />
      )}
    </>
  );
};

export default AvatarImage;
