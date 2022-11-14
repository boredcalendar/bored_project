import today from "../../public/today.svg";

const Today = () => {
  const timeIsToday = JSON.parse(localStorage.getItem("DataBase") || "{}");
  return (
    <div className="px-4 pt-4 rounded-2xl bg-grayish-500">
      <a href="">
        <div className="font-bold">Today</div>
        Time is {timeIsToday.time} minuts
        <div>
          <img src={today} />
        </div>
      </a>
    </div>
  );
};
export default Today;
