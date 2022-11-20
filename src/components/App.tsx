import React from "react";
import Calendar from "react-calendar";
import CircularSlider from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";

import avatar from "/avatar.svg";
import celendar from "/celendar.svg";
// import swipeweek from "/swipeweek.svg"; - пример календаря, удалить после верстки
import "react-calendar/dist/Calendar.css";

const queryClient = new QueryClient();

type DayStats = {
  date: string;
  time: number;
};

const db =
  typeof document === "object"
    ? window.openDatabase("MyBD", "1.0", "Test DB", 2 * 1024 * 1024)
    : undefined;

const App: React.FC<{}> = () => {
  const [value, onChange] = React.useState(new Date());
  const date = `${value.getDate()}${
    value.getMonth() + 1
  }${value.getFullYear()}`;

  const [chooseDay, setChooseDay] = React.useState("");
  const chooseDayString = new String(chooseDay);

  const { isLoading, error, data } = useQuery({
    queryKey: ["stats"],
    queryFn: () =>
      new Promise<DayStats[]>((resolve) => {
        db.transaction((tx) => {
          tx.executeSql("CREATE TABLE IF NOT EXISTS LOGS ( date, time)");
          tx.executeSql(
            "SELECT date, SUM(time) as time FROM LOGS WHERE date=? GROUP BY date",
            [date],
            (tx, result) => {
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
            (tx, result) => {
              resolve([...(result.rows as unknown as DayStats[])]);
            }
          );
          // tx.executeSql("DROP TABLE LOGS"); // - command for drop table
        });
      }),
  });

  const ButtonTimer = ({ onClick }: { onClick: () => void }) => {
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
              onClick();
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

  const Statistic = ({ data: stats }: { data: DayStats[] }) => {
    // я просто думаю что делать когда нет данных
    const data = stats.map((item) => {
      return {
        id: item.date,
        ranges: [1, 5, 20, 40, 60],
        measures: [item.time || 0],
        markers: [5, 20],
      };
    });

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
      {!isLoading && <Calendar onChange={onChange} value={value} />}
      {/* <img src={swipeweek} /> - пример календаря, удалить после верстки */}
      {!isLoading && data && <Statistic data={data} />}
      <div>
        <Today />
      </div>
      <div className="flex items-center justify-center">
        {import.meta.env.DEV && (
          <ButtonTimer
            onClick={() => queryClient.invalidateQueries(["stats"])}
          />
        )}
      </div>
    </div>
  );
};

export default () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};
