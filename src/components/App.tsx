import React from "react";
import Calendar from "react-calendar";
import CircularSlider from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";

import avatar from "/avatar.svg";
import celendar from "/celendar.svg";
// import swipeweek from "/swipeweek.svg"; - пример календаря, удалить после верстки
import "react-calendar/dist/Calendar.css";

const App: React.FC<{}> = () => {
  const [value, onChange] = React.useState(new Date());
  const date = `${value.getDate()}${value.getMonth()}${value.getFullYear()}`;

  const [allTablet, setAllTablet] = React.useState<{}>();

  const [chooseDay, setChooseDay] = React.useState<{}>();
  const chooseDayString = new String(chooseDay);
  // console.log(chooseDay);
  // console.log(chooseDayString.indexOf("time"));
  // console.log(chooseDayString.indexOf("37"));
  // console.log(typeof +chooseDayString.substr(-2));

  const db = openDatabase("MyBD", "1.0", "Test DB", 2 * 1024 * 1024);
  db.transaction((tx: any) => {
    tx.executeSql("CREATE TABLE IF NOT EXISTS LOGS ( date, time)");
    tx.executeSql("INSERT INTO LOGS (date , time) VALUES (?, ?)", [date, 0]);
    tx.executeSql(
      "SELECT date, SUM(time) as time FROM LOGS WHERE date=? GROUP BY date",
      [date],
      (tx: any, result: any) => {
        const res = JSON.stringify(result.rows).replace(
          /[^a-zа-яё0-9\s]/gi,
          ""
        );
        setChooseDay(res);
      }
    );
    tx.executeSql(
      "SELECT date, SUM(time) as time FROM LOGS GROUP BY date ORDER BY date DESC",
      [],
      (tx: any, result: any) => {
        const res = JSON.stringify(result.rows)
          .replace(
            /[^a-zа-яё0-9:,]/gi,
            // /[^a-zа-яё0-9\s]/gi,
            ""
          )
          .replace(/[dateim]/g, "");
        setAllTablet(res);
      }
    );
    // tx.executeSql("DROP TABLE LOGS"); // - дроп таблицы
  });

  const ButtonTimer: React.FC<{}> = () => {
    const [minuts, setMinuts] = React.useState(0);
    const [click, setClick] = React.useState(true);

    // - localStorage не используем, оставить удалить в конце
    // ------------
    // if (localStorage.length === 0 || localStorage.getItem(`${date}`) === null)
    //   localStorage.setItem(`${date}`, JSON.stringify({ time: 0 }));
    // const raw = localStorage.getItem(`${date}`);
    // const upDateDataBase = JSON.parse(raw!);
    // ------------

    return (
      <>
        <CircularSlider
          width={165}
          min={0}
          max={15}
          valueFontSize="2rem"
          label="You Bored?"
          labelColor="#FFFFFF"
          labelBottom={true}
          labelFontSize="1rem"
          knobColor="#1C1C1E"
          progressColorFrom="#B1D0E6"
          progressColorTo="#9CA3AF"
          progressSize={16}
          trackSize={16}
          trackColor="#F9FAFB"
          dataIndex={0}
          onChange={(value: any) => {
            setMinuts(value);
          }}
        />
        <div
          className={
            click
              ? "bg-bluish-500 absolute z-50 cursor-pointer rounded-full h-28 w-28"
              : "bg-grayish-900 absolute z-50 cursor-pointer rounded-full h-28 w-28"
          }
        >
          <div
            className="flex flex-col justify-center items-center h-28 w-28"
            onMouseDown={() => setClick(false)}
            onMouseUp={() => setClick(true)}
            onClick={(e) => {
              // upDateDataBase.time = upDateDataBase.time + minuts; // - localStorage не используем, оставить удалить в конце
              // localStorage.setItem(`${date}`, JSON.stringify(upDateDataBase)); // - localStorage не используем, оставить удалить в конце
              db.transaction(function (tx: any) {
                tx.executeSql("INSERT INTO LOGS (date , time) VALUES (?, ?)", [
                  date,
                  minuts,
                ]);
              });

              e.stopPropagation();
              location.reload(); // - перезагрузка мешает многоразовому добавлению данных
            }}
          >
            <div className="text-white">{minuts}</div>
            <div className="text-white">You Bored?</div>
          </div>
        </div>
      </>
    );
  };

  const Today = () => {
    const timeIsToday =
      +chooseDayString.slice(-2) || +chooseDayString.slice(-1) || 0; // без перезагрузки не дает обновленную страничку, без нуля выдает NaN
    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Today</div>
        Time is {timeIsToday} minuts
        <Bullet
          data={[
            {
              id: "",
              ranges: [0, 60],
              measures: [timeIsToday],
              markers: [5, 20],
            },
          ]}
          margin={{ top: 0, right: 10, bottom: 25, left: 10 }}
          spacing={0}
          titleAlign="start"
          rangeColors="blues"
          measureColors="seq:greys"
          measureBorderColor="#B1D0E6"
          measureBorderWidth={1}
          markerColors="seq:yellow_orange_brown"
          height={55}
          width={300}
        />
      </div>
    );
  };

  const Statistic = () => {
    const allStatistics = JSON.parse(localStorage.getItem(`${date}`) || "{}"); // перевести данные из строки и разбить по датам и времени

    // const allStatistics1 = new Array(allTablet);
    console.log(allTablet);

    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Statistic</div>
        Time is {allStatistics.time} minuts
        <Bullet
          data={[
            {
              id: `${date}`,
              ranges: [1, 5, 20, 40, 60],
              measures: [allStatistics.time],
              markers: [5, 20],
            },
          ]}
          margin={{ top: 20, right: 25, bottom: 10, left: 0 }}
          spacing={0}
          titleAlign="end"
          titleOffsetX={0}
          titleOffsetY={-15}
          titleRotation={-90}
          rangeColors="blues"
          layout="vertical"
          measureColors="seq:greys"
          measureBorderColor="#bbb9b9"
          measureBorderWidth={1}
          markerColors="seq:yellow_orange_brown"
          height={300}
          width={55}
        />
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-white h-auto max-w-sm">
      <div className="grid grid-cols-3">
        <div className="flex items-center col-start-1 col-end-3">
          <img src={avatar} />
          Hello,<span className="font-bold">Aida</span>
        </div>
        <div className="flex items-center justify-end col-start-3 col-end-4">
          <img src={celendar} />
        </div>
      </div>
      <Calendar onChange={onChange} value={value} />
      {/* <img src={swipeweek} /> - пример календаря, удалить после верстки */}
      <Statistic />
      <div>
        <Today />
      </div>
      <div className="flex items-center justify-center">
        <ButtonTimer />
      </div>
    </div>
  );
};

export default App;
