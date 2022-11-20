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
  const date = `${value.getDate()}${
    value.getMonth() + 1
  }${value.getFullYear()}`;

  const [allTablet, setAllTablet] = React.useState("");
  const [chooseDay, setChooseDay] = React.useState("");
  const chooseDayString = new String(chooseDay);

  const db = openDatabase("MyBD", "1.0", "Test DB", 2 * 1024 * 1024);
  React.useEffect(() => {
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
        "SELECT date, SUM(time) as time FROM LOGS GROUP BY date ORDER BY date DESC LIMIT 7", // - отредактировать запрос добавить выборку от сегодня и на 7 дней назад
        [],
        (tx: any, result: any) => {
          const res = JSON.stringify(result.rows).replace(
            /[^a-zа-яё0-9:,]/gi,
            ""
          );
          setAllTablet(res);
        }
      );
      // tx.executeSql("DROP TABLE LOGS"); // - command for drop table
    });
  }, []);

  const ButtonTimer: React.FC<{}> = () => {
    const [minuts, setMinuts] = React.useState(0);
    const [click, setClick] = React.useState(true);

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
    const isStringAllTablet = new String(allTablet);

    const statisticsOfLastSevenDays = [
      isStringAllTablet
        .replace(/[0-9]:date:/g, "")
        .replace(/time:/g, "")
        .split(","),
    ];

    const [day7, day6, day5, day4, day3, day2, day1] = [
      statisticsOfLastSevenDays[0][0],
      statisticsOfLastSevenDays[0][2],
      statisticsOfLastSevenDays[0][4],
      statisticsOfLastSevenDays[0][6],
      statisticsOfLastSevenDays[0][8],
      statisticsOfLastSevenDays[0][10],
      statisticsOfLastSevenDays[0][12],
    ];
    const [
      timeDay7,
      timeDay6,
      timeDay5,
      timeDay4,
      timeDay3,
      timeDay2,
      timeDay1,
    ] = [
      // statisticsOfLastSevenDays[0][1],
      // statisticsOfLastSevenDays[0][3],
      // statisticsOfLastSevenDays[0][5],
      // statisticsOfLastSevenDays[0][7],
      // statisticsOfLastSevenDays[0][9],
      // statisticsOfLastSevenDays[0][11],
      // statisticsOfLastSevenDays[0][13],
      1, 2, 33, 4, 5, 6, 7,
    ];

    const data = [
      {
        id: `${day1}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay1 === undefined ? 0 : +timeDay1],
        markers: [5, 20],
      },
      {
        id: `${day2}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay2 === undefined ? 0 : +timeDay2],
        markers: [5, 20],
      },
      {
        id: `${day3}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay3 === undefined ? 0 : +timeDay3],
        markers: [5, 20],
      },
      {
        id: `${day4}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay4 === undefined ? 0 : +timeDay4],
        markers: [5, 20],
      },
      {
        id: `${day5}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay5 === undefined ? 0 : +timeDay5],
        markers: [5, 20],
      },
      {
        id: `${day6}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay6 === undefined ? 0 : +timeDay6],
        markers: [5, 20],
      },
      {
        id: `${day7}`,
        ranges: [1, 5, 20, 40, 60],
        measures: [+timeDay7 === undefined ? 0 : +timeDay7],
        markers: [5, 20],
      },
    ];

    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Statistic</div>
        <Bullet
          data={data}
          margin={{ top: 20, right: 25, bottom: 10, left: 0 }}
          spacing={30}
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
          width={300}
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
