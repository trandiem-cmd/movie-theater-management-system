const formatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Europe/Helsinki",
  dateStyle: "short",
  timeStyle: "short",
});

export const formatDate = (date) => {
  if (!date) return "";
  return formatter.format(new Date(date));
};