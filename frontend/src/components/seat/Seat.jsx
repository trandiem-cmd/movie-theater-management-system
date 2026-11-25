import { Armchair, Accessibility } from "lucide-react";
import "./Seat.css";

function Seat({
  number,
  status = "available",
  type = "standard",
  onClick,
}) {
  const isDisabled =
    status === "booked" ||
    status === "held" ||
    status === "unavailable" ||
    status === "inactive";

  const isSelected = status === "selected";
  const isWheelchair = type === "wheelchair";

  return (
    <button
      type="button"
      className={`seat seat--${status} ${
        isWheelchair ? "seat--wheelchair" : ""
      }`}
      onClick={onClick}
      disabled={isDisabled}
      aria-pressed={isSelected}
      aria-label={`${isWheelchair ? "Wheelchair space" : "Seat"} ${number}, ${status}`}
      title={`${isWheelchair ? "Wheelchair space" : "Seat"} ${number} - ${status}`}
    >
      {isWheelchair ? (
        <Accessibility size={20} strokeWidth={2.5} />
      ) : (
        <Armchair size={24} strokeWidth={2.8} />
      )}
    </button>
  );
}

export default Seat;
