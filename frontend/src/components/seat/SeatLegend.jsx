
import { Armchair, Accessibility, Info } from "lucide-react";
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
    label: "Wheelchair space",
    description: "Accessible seating",
    status: "wheelchair",
  },
];

function SeatLegend() {
  return (
    <aside className="seat-legend">
      <h3>Seat Legend</h3>

      <div className="seat-legend-list">
        {seatTypes.map((type) => (
          <div className="seat-legend-item" key={type.status}>
           <span className={`seat-legend-chair seat seat--${type.status}`}>
              {type.status === "wheelchair" ? (
                <Accessibility size={19} />
              ) : (
                <Armchair size={21} strokeWidth={2.5} />
              )}
            </span>

            <div>
              <strong>{type.label}</strong>
              <small>{type.description}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="seat-room-rules">
        <h3>
          <Info size={17} />
          Room Rules
        </h3>

        <ul>
          <li>10 seats per standard row.</li>
          <li>Row 13 is skipped where applicable.</li>
          <li>Wheelchair spaces are limited and clearly marked.</li>
        </ul>
      </div>
    </aside>
  );
}

export default SeatLegend;
