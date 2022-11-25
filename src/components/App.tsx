import React from "react";
import Calendar from "react-calendar";
import CircularSlider from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
// import localforage from "localforage";

import avatar from "/avatar.svg";
import celendar from "/celendar.svg";
// import swipeweek from "/swipeweek.svg"; - пример календаря, удалить после верстки
import "react-calendar/dist/Calendar.css";
import IndexedDb from "./IndexedDB";

// type MyType = [id: number, date: Date, time: number];

const queryClient = new QueryClient();

const App: React.FC<{}> = () => {
  const [value, onChange] = React.useState(new Date());
  const [timeOfButtonTimer, setTimeOfButtonTimer] = React.useState(0);
  const date = `${value.getDate()}${
    value.getMonth() + 1
  }${value.getFullYear()}`;

  const [chooseDay, setChooseDay] = React.useState("");
  const chooseDayString = new String(chooseDay);

  const { isLoading, error, data } = useQuery({
    queryKey: [`${value.setHours(0, 0, 0, 0)}`],
    queryFn: async () => {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      const upload = await indexedDb.getValue(
        "Logs",
        value.setHours(0, 0, 0, 0)
      ); // для изъятия времени сейчас и последующего складывания его с новым числом
      await indexedDb.putValue("Logs", {
        id: value.setHours(0, 0, 0, 0),
        date: date,
        time: upload === undefined ? 0 : upload.time + timeOfButtonTimer, // Без проверки не создает самую первуюзапись
      });
      const localData = await indexedDb.getValue(
        "Logs",
        value.setHours(0, 0, 0, 0)
      ); // надо изъять в график суток. нужно для отображения времени после изменений
      console.log("upload", upload.time);
      console.log("localData", localData.time);

      const allDB = await indexedDb.getAllValue("Logs"); // надо взять 7 последних дат и вывести в статистику данные
      console.log("alldb", allDB); // надо вывести в статистику

      return [localData.time];
    },
  });

  console.log(data);

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
              setTimeOfButtonTimer(minuts);
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
    const timeIsToday = data || 0; // по нажатию кнопки не записывает значение. Записывает тольео если в консоли открыть массив и нажать на бегунок
    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Today</div>
        Time is {timeIsToday} minuts
        <Bullet
          data={[
            {
              id: "",
              ranges: [0, 60],
              measures: [timeIsToday], // ошибка второй очереди
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
    // сюда добавить allDB
    const data = [
      {
        id: "item.date",
        ranges: [1, 5, 20, 40, 60],
        measures: [43],
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
      {!isLoading && <Calendar onChange={onChange} value={value} />}
      {/* <img src={swipeweek} /> - пример календаря, удалить после верстки */}
      {!isLoading && data && <Statistic />}
      <div>
        <Today />
      </div>
      <div className="flex items-center justify-center">
        {import.meta.env.DEV && (
          <ButtonTimer
            onClick={() => queryClient.invalidateQueries(["Logs"])}
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
