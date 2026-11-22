import Seat from "./Seat";
import "./SeatMap.css";

// Generate seat rows, skipping row 13
const generateRowNumbers = (rowCount) =>
  Array.from({ length: rowCount }, (_, index) => {
    const row = index + 1;
    return row >= 13 ? row + 1 : row;
  });

function SeatMap({
  selectedSeats = [],
  onSeatClick,
  selectedWheelchairSpaces = [],
  onWheelchairClick,
  rowCount = 10,
  seatsPerRow = 10,
  seats,
  wheelchairSpaces,
}) {
  const hasSeatData = Array.isArray(seats);
  const hasWheelchairData = Array.isArray(wheelchairSpaces);

  const rowNumbers = hasSeatData
    ? [...new Set(seats.map((seat) => seat.row))].sort(
        (a, b) => a - b
      )
    : generateRowNumbers(rowCount);

  // Use backend wheelchair spaces when provided
  const wheelchairNumbers = hasWheelchairData
    ? wheelchairSpaces.map((space) => space.spaceNumber)
    : [1, 2];

  return (
    <div className="seat-map">
      <div className="seat-map-screen">SCREEN</div>

      {/* Wheelchair spaces */}
      <div className="seat-map-wheelchair-spaces">
        {wheelchairNumbers.map((spaceNumber) => {
          const wheelchairSpace = wheelchairSpaces?.find(
            (space) => space.spaceNumber === spaceNumber
          );

          const isSelected =
            selectedWheelchairSpaces.includes(spaceNumber);

          const unavailable = [
            "booked",
            "held",
            "inactive",
            "unavailable",
          ].includes(wheelchairSpace?.status);

          const status = unavailable
            ? wheelchairSpace.status
            : isSelected
              ? "selected"
              : "available";

          return (
            <Seat
              key={spaceNumber}
              number={`W${spaceNumber}`}
              type="wheelchair"
              status={status}
              onClick={() => {
                if (!unavailable) {
                  onWheelchairClick?.(spaceNumber);
                }
              }}
            />
          );
        })}
      </div>

      {/* Regular seat rows */}
      <div className="seat-map-rows">
        {rowNumbers.map((rowNumber, rowIndex) => {
          let rowSeats;

          if (hasSeatData) {
            rowSeats = seats
              .filter((seat) => seat.row === rowNumber)
              .sort((a, b) => {
                const first = a.displayOrder ?? a.number;
                const second = b.displayOrder ?? b.number;

                return first - second;
              });
          } else {
            const seatNumbers = Array.from(
              { length: seatsPerRow },
              (_, seatIndex) => {
                const position =
                  rowIndex * seatsPerRow + seatIndex + 1;

                return position >= 13
                  ? position + 1
                  : position;
              }
            );

            if (rowIndex % 2 === 1) {
              seatNumbers.reverse();
            }

            rowSeats = seatNumbers.map((number) => ({
              number,
              status: "available",
            }));
          }

          return (
            <div
              className="seat-map-row"
              key={rowNumber}
            >
              <span className="seat-map-row-label">
                {rowNumber}
              </span>

              {rowSeats.map((seat) => {
                const isSelected =
                  selectedSeats.includes(seat.number);

                const unavailable = [
                  "booked",
                  "held",
                  "inactive",
                  "unavailable",
                ].includes(seat.status);

                const status = unavailable
                  ? seat.status
                  : isSelected
                    ? "selected"
                    : "available";

                return (
                  <Seat
                    key={seat.id ?? seat.number}
                    number={seat.number}
                    type="standard"
                    status={status}
                    onClick={() => {
                      if (!unavailable) {
                        onSeatClick?.(seat.number);
                      }
                    }}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SeatMap;
