import React from "react";
import Calendar from "react-calendar";
import * as CircularSliderM from "@fseehawer/react-circular-slider";
import CircularSlider from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";

import avatar from "/avatar.svg";
import celendar from "/celendar.svg";
// import swipeweek from "/swipeweek.svg"; - пример календаря, удалить после верстки
import "react-calendar/dist/Calendar.css";
import IndexedDb from "./IndexedDB";

const CircularSliderS: typeof CircularSliderM.default = (CircularSliderM as any)
  .default.default;

const queryClient = new QueryClient();

const App: React.FC<{}> = () => {
  const [value, onChange] = React.useState(new Date());
  const date = `${value.getDate()}${
    value.getMonth() + 1
  }${value.getFullYear()}`;

  const {
    isLoading: loadingDate,
    error: errorDate,
    data: dataDate,
    refetch,
  } = useQuery({
    queryKey: [`${value.setHours(0, 0, 0, 0)}`],
    queryFn: async () => {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      const upload = await indexedDb.getValue(
        "Logs",
        value.setHours(0, 0, 0, 0)
      );
      await indexedDb.putValue("Logs", {
        id: value.setHours(0, 0, 0, 0),
        date: date,
        time: upload === undefined ? 0 : upload.time,
      });
      const localData = await indexedDb.getValue(
        "Logs",
        value.setHours(0, 0, 0, 0)
      );
      return [localData.time];
    },
  });

  errorDate && console.log(errorDate);

  const useTime = () => {
    return useMutation(async (addTime: number) => {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      const minuts = dataDate || 0;
      await indexedDb
        .putValue("Logs", {
          id: value.setHours(0, 0, 0, 0),
          date: date,
          time: +minuts + addTime,
        })
        .then(refetch);
      return;
    });
  };

  const addTime = useTime();

  const ButtonTimer = ({ onClick }: { onClick: () => void }) => {
    const [minuts, setMinuts] = React.useState(0);
    const [click, setClick] = React.useState(true);

    return (
      <>
        {import.meta.env.DEV ? (
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
        ) : (
          <CircularSliderS
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
        )}
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
              e.stopPropagation();
              addTime.mutateAsync(minuts).catch((err) => console.log(err));
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
    const timeIsToday = dataDate || 0;
    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Today</div>
        Time is {timeIsToday} minuts
        <Bullet
          data={[
            {
              id: "",
              ranges: [0, 60],
              measures: [+timeIsToday],
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
    const {
      isLoading: loadingAll,
      error: errorAll,
      data: dataAll,
    } = useQuery({
      queryKey: [`logs`],
      queryFn: async () => {
        const indexedDb = new IndexedDb("Calendar");
        await indexedDb.createObjectStore(["Logs"]);
        const allDB = await indexedDb.getAllValue("Logs");
        return allDB;
      },
    });

    errorAll && console.log(errorAll);

    const statistics =
      dataAll
        ?.reverse()
        .map((x: any) => ({
          id: `${x.date}`,
          ranges: [1, 5, 20, 40, 60],
          measures: [x.time],
          markers: [5, 20],
        }))
        .slice(0, 7) || [];

    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">Statistic</div>
        <Bullet
          data={statistics}
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
      {!loadingDate && <Calendar onChange={onChange} value={value} />}
      {/* <img src={swipeweek} /> - пример календаря, удалить после верстки */}
      {!loadingDate && dataDate && <Statistic />}
      <div>
        <Today />
      </div>
      <div className="flex items-center justify-center">
        <ButtonTimer onClick={() => queryClient.invalidateQueries(["Logs"])} />
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
