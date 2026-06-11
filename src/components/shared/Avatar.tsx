import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn, getInitials } from "@/lib/utils"

const sizeMap = {
  xs: "h-5 w-5 text-[10px]",
  sm: "h-6 w-6 text-xs",
  md: "h-8 w-8 text-sm",
  lg: "h-10 w-10 text-base",
}

interface UserAvatarProps {
  name: string
  avatar?: string
  size?: keyof typeof sizeMap
  className?: string
}

export function UserAvatar({ name, avatar, size = "md", className }: UserAvatarProps) {
  return (
    <AvatarRoot className={cn(sizeMap[size], className)}>
      {avatar ? <AvatarImage src={avatar} alt={name} /> : null}
      <AvatarFallback className="bg-primary/10 text-primary font-medium">
        {getInitials(name)}
      </AvatarFallback>
    </AvatarRoot>
  )
}

interface AvatarStackProps {
  users: Array<{ _id: string; name: string; avatar?: string }>
  max?: number
  size?: keyof typeof sizeMap
}

export function AvatarStack({ users, max = 3, size = "sm" }: AvatarStackProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - visible.length

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u) => (
        <UserAvatar
          key={u._id}
          name={u.name}
          avatar={u.avatar}
          size={size}
          className="ring-2 ring-background"
        />
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            sizeMap[size],
            "flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium ring-2 ring-background"
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
