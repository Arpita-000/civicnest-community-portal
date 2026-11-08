import toast from "react-hot-toast";

/**
 * Modules that are scheduled for a later weekly milestone (map, forum, NGOs ...).
 * Instead of linking to a page that does not exist yet, show a friendly message.
 */
export function comingSoon(feature: string) {
  toast(`${feature} is coming in an upcoming weekly milestone.`, { icon: "🚧", id: `soon-${feature}` });
}
