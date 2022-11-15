import { Bullet } from "@nivo/bullet";

const Today = () => {
  const timeIsToday = JSON.parse(localStorage.getItem("DataBase") || "{}");
  return (
    <div className="px-4 py-4 rounded-2xl bg-grayish-500">
      <a href="">
        <div className="font-bold">Today</div>
        Time is {timeIsToday.time} minuts
        <div className="min-w-0">
          <Bullet
            data={[
              {
                id: "",
                ranges: [0, 10, 20, 60],
                measures: [timeIsToday.time],
                markers: [20],
              },
            ]}
            minValue="auto"
            maxValue="auto"
            rangeBorderWidth={10}
            measureBorderColor={{ from: "color", modifiers: [] }}
            measureBorderWidth={10}
            markerSize={1}
            rangeColors="blues"
            measureColors="seq:blues"
            markerColors="seq:yellow_orange_brown"
            height={50}
            width={300}
          />
        </div>
      </a>
    </div>
  );
};
export default Today;
