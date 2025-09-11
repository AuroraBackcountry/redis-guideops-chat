// @ts-check

import React from "react";
import OnlineIndicator from "../../OnlineIndicator";
import AvatarImage from "./AvatarImage";

const Footer = ({ user }) => (
  <div
    className="row no-gutters align-items-center pl-4 pr-4 pb-3"
    style={{ height: "inherit", flex: 0, minHeight: 50 }}
  >
    {/* Just show user info - logout moved to hamburger menu */}
    <UserInfo user={user} col={12} />
  </div>
);

const UserInfo = ({ user, col = 12, noinfo = false }) => (
  <div className={`col-${col} d-flex align-items-center`}>
    <div className="align-self-center mr-3">
      <AvatarImage name={user.username} id={user.id} />
    </div>
    <div className="media-body">
      <h5 className="font-size-14 mt-0 mb-1">{user.username}</h5>
      <div className="d-flex align-items-center">
        <OnlineIndicator online={true} />
        <p className="ml-2 text-muted mb-0">Active</p>
      </div>
    </div>
  </div>
);

export default Footer;
