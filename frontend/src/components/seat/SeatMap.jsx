
import Seat from "./Seat";

function SeatMap({
  selectedSeats,
  onSeatClick,
  rowCount = 10,
  seatsPerRow = 10,
}) {
  const rowNumbers = Array.from(
    { length: rowCount },
    (_, index) => {
      const row = index + 1;
      return row >= 13 ? row + 1 : row;
    }
  );

  return (
    <div className="seat-map">
      <div className="seat-map-screen">SCREEN</div>

      <div className="seat-map-rows">
        {rowNumbers.map((rowNumber, rowIndex) => {
          const seatNumbers = Array.from(
            { length: seatsPerRow },
            (_, seatIndex) =>
              rowIndex * seatsPerRow + seatIndex + 1
          );

          // Reverse every second row (snake numbering)
          if (rowIndex % 2 === 1) {
            seatNumbers.reverse();
          }

          return (
            <div className="seat-map-row" key={rowNumber}>
              <span className="seat-map-row-label">
                {rowNumber}
              </span>

              {seatNumbers.map((seatNumber) => (
                <Seat
                  key={seatNumber}
                  number={seatNumber}
                  status={
                    selectedSeats.includes(seatNumber)
                      ? "selected"
                      : "available"
                  }
                  onClick={() => onSeatClick(seatNumber)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SeatMap;
