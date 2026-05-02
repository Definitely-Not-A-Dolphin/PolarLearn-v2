import type { ComponentProps } from "react"

import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar"
import { cn } from "~/lib/utils"

type UserAvatarProps = {
  name?: string | null
  image?: string | null
  size?: ComponentProps<typeof Avatar>["size"]
  className?: string
}

function getInitial(name?: string | null) {
  return name?.trim().charAt(0).toUpperCase() ?? "U"
}

export function UserAvatar({
  name,
  image,
  size = "default",
  className,
}: UserAvatarProps) {
  return (
    <Avatar size={size} className={cn(className)}>
      {image ? <AvatarImage src={image} alt={name ?? "User"} /> : null}
      <AvatarFallback>{getInitial(name)}</AvatarFallback>
    </Avatar>
  )
}