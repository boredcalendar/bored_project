import { Bullet } from "@nivo/bullet";

const Today = () => {
  const timeIsToday = JSON.parse(localStorage.getItem("DataBase") || "{}");
  return (
    <div className="px-4 py-4 rounded-2xl bg-grayish-500">
      <a href="">
        <div className="font-bold">Today</div>
        Time is {timeIsToday.time} minuts
      </a>
      <Bullet
        data={[
          {
            id: "",
            ranges: [1, 5, 20, 40, 60],
            measures: [timeIsToday.time],
            markers: [5, 20],
          },
        ]}
        margin={{ top: 0, right: 10, bottom: 25, left: 10 }}
        spacing={0}
        titleAlign="start"
        rangeColors="blues"
        measureColors="seq:greys"
        measureBorderColor="#bbb9b9"
        measureBorderWidth={1}
        markerColors="seq:yellow_orange_brown"
        height={55}
        width={300}
      />
    </div>
  );
};
export default Today;
