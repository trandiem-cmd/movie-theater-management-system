import {
  Armchair,
  Accessibility,
  Info,
  Pencil,
} from "lucide-react";

import "./SeatLegend.css";

const seatTypes = [
  {
    label: "Available seat",
    description: "You can select this seat",
    status: "available",
  },
  {
    label: "Selected seat",
    description: "Your chosen seat(s)",
    status: "selected",
  },
  {
    label: "Booked seat",
    description: "Not available",
    status: "booked",
  },
  {
    label: "Held seat",
    description: "Temporarily reserved",
    status: "held",
  },
  {
    label: "Unavailable seat",
    description: "Not available for booking",
    status: "unavailable",
  },
  {
    label: "Wheelchair space",
    description: "Accessible seating",
    status: "wheelchair",
  },
];

const defaultRoomRules = [
  "10 seats per standard row.",
  "Row 13 is skipped.",
  "Seat numbering follows a snake pattern.",
  "Wheelchair spaces are managed separately.",
];

const customerBookingRules = [
  "Maximum 6 tickets per booking.",
  "Wheelchair spaces are marked with an accessibility icon.",
  "Booked and temporarily held seats cannot be selected.",
];

function SeatLegend({
  onEditRules,
  roomRules,
  isCustomer = false,
}) {
  const displayedRules = isCustomer
    ? customerBookingRules
    : roomRules ?? defaultRoomRules;

  return (
    <aside className="seat-legend">
      <h3>Seat Legend</h3>

      {/* Seat status legend */}
      <div className="seat-legend-list">
        {seatTypes.map((type) => (
          <div
            className="seat-legend-item"
            key={type.status}
          >
            <span
              className={`seat-legend-chair seat seat--${type.status}`}
            >
              {type.status === "wheelchair" ? (
                <Accessibility size={19} />
              ) : (
                <Armchair
                  size={21}
                  strokeWidth={2.5}
                />
              )}
            </span>

            <div>
              <strong>{type.label}</strong>
              <small>{type.description}</small>
            </div>
          </div>
        ))}
      </div>

      {/* Room rules or customer booking information */}
      <div className="seat-room-rules">
        <div className="seat-room-rules-heading">
          <h3>
            <Info size={17} />
            {isCustomer
              ? "Booking Information"
              : "Room Rules"}
          </h3>

          {!isCustomer && onEditRules && (
            <button
              type="button"
              onClick={onEditRules}
              className="seat-room-rules-edit"
              aria-label="Edit room rules"
              title="Edit room rules"
            >
              <Pencil size={17} />
            </button>
          )}
        </div>

        <ul>
          {displayedRules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

export default SeatLegend;
