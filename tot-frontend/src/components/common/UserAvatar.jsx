import { formatMediaUrl } from "../../utils/mediaUrl";

const DEFAULT_AVATAR_URL = "/assets/images/pf4.png";

function showDefaultAvatar({ currentTarget }) {
  if (currentTarget.getAttribute("src") !== DEFAULT_AVATAR_URL) {
    currentTarget.src = DEFAULT_AVATAR_URL;
  }
}

export default function UserAvatar({ src, ...props }) {
  return (
    <img
      {...props}
      src={formatMediaUrl(src, DEFAULT_AVATAR_URL)}
      onError={showDefaultAvatar}
    />
  );
}
