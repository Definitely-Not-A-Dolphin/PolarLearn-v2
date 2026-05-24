import z from "zod";
import {
  Info,
  AlertTriangle,
  CheckCircle,
  Bell,
  Star,
  MailCheck,
  type LucideIcon,
} from "lucide-react";

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  content: z.string(),
  icon: z.string(),
  navigate: z.string().optional(),
  read: z.boolean(),
  createdAt: z.string(),
})

export type Notification = z.infer<typeof notificationSchema>;

export const notificationIcons: readonly {
  value: string;
  labelKey: string;
  icon: LucideIcon;
}[] = [
  { value: "info", labelKey: "admin.users.notificationIcons.info", icon: Info },
  { value: "warning", labelKey: "admin.users.notificationIcons.warning", icon: AlertTriangle },
  { value: "success", labelKey: "admin.users.notificationIcons.success", icon: CheckCircle },
  { value: "bell", labelKey: "admin.users.notificationIcons.bell", icon: Bell },
  { value: "star", labelKey: "admin.users.notificationIcons.star", icon: Star },
  { value: "mail", labelKey: "admin.users.notificationIcons.mail", icon: MailCheck },
] as const;