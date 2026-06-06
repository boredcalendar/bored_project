import React from "react";
import Calendar from "react-calendar";
import * as CircularSliderModule from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";

// Assets in public/ are referenced by URL, not imported (Astro 3+ astro:assets).
import "react-calendar/dist/Calendar.css";
import IndexedDb from "./IndexedDB";

type CircularSliderProps = {
  width: number;
  min: number;
  max: number;
  valueFontSize: string;
  label: string;
  labelColor: string;
  labelBottom: boolean;
  labelFontSize: string;
  knobColor: string;
  progressColorFrom: string;
  progressColorTo: string;
  progressSize: number;
  trackSize: number;
  trackColor: string;
  dataIndex: number;
  onChange: (value: number) => void;
};

type CircularSliderComponent = React.ComponentType<CircularSliderProps>;
type CircularSliderExport = CircularSliderComponent | { default: CircularSliderComponent };

const circularSliderExport = CircularSliderModule.default as CircularSliderExport;
// v3 exports the component (a forwardRef object) directly as `default`; older
// builds nested it under `default.default`. Unwrap the nested case if present.
const CircularSlider =
  "default" in circularSliderExport ? circularSliderExport.default : circularSliderExport;

const queryClient = new QueryClient();

type LogEntry = {
  id: number;
  date: string;
  time: number;
  reflection?: string;
};

const App: React.FC<{}> = () => {
  const [value, onChange] = React.useState(new Date());
  const dayStart = new Date(value);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartTime = dayStart.getTime();
  const date = value.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const {
    isLoading: loadingDate,
    error: errorDate,
    data: dataDate,
    refetch,
  } = useQuery({
    queryKey: [`${dayStartTime}`],
    queryFn: async () => {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      const upload = (await indexedDb.getValue("Logs", dayStartTime)) as LogEntry | undefined;
      const localData: LogEntry = {
        id: dayStartTime,
        date: date,
        time: upload === undefined ? 0 : upload.time,
        reflection: upload?.reflection ?? "",
      };
      await indexedDb.putValue("Logs", localData);
      return localData;
    },
  });

  const { error: errorAll, data: dataAll } = useQuery({
    queryKey: ["logs"],
    queryFn: async () => {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      const allDB = (await indexedDb.getAllValue("Logs")) as LogEntry[];
      return allDB;
    },
  });

  if (errorDate) console.log(errorDate);
  if (errorAll) console.log(errorAll);

  const loggedDays = new Map(dataAll?.map((entry) => [entry.id, entry]) ?? []);

  const useLogEntry = () => {
    return useMutation({
      mutationFn: async ({ minutes, reflection }: { minutes: number; reflection: string }) => {
        const indexedDb = new IndexedDb("Calendar");
        await indexedDb.createObjectStore(["Logs"]);
        const trimmedReflection = reflection.trim();

        if (minutes === 0 && trimmedReflection === "") {
          await indexedDb.deleteValue("Logs", dayStartTime);
          await refetch();
          await queryClient.invalidateQueries({ queryKey: ["logs"] });
          return;
        }

        await indexedDb
          .putValue("Logs", {
            id: dayStartTime,
            date: date,
            time: minutes,
            reflection: trimmedReflection,
          })
          .then(async () => {
            await refetch();
            await queryClient.invalidateQueries({ queryKey: ["logs"] });
          });
        return;
      },
    });
  };

  const logEntry = useLogEntry();

  const LogMoment = ({
    initialMinutes,
    initialReflection,
  }: {
    initialMinutes: number;
    initialReflection: string;
  }) => {
    const [minutes, setMinutes] = React.useState(initialMinutes);
    const [reflection, setReflection] = React.useState(initialReflection);
    const [click, setClick] = React.useState(true);
    const savedMinutes = initialMinutes;
    const savedReflection = initialReflection.trim();
    const currentReflection = reflection.trim();
    const hasSavedDay = savedMinutes > 0 || savedReflection !== "";
    const hasChanges = minutes !== savedMinutes || currentReflection !== savedReflection;
    const canSave = hasChanges;
    const buttonText = hasSavedDay ? "Update day" : "Save day";

    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-bluish-100 px-4 py-4">
        <div>
          <div className="font-bold">Remember this day</div>
          <div className="text-sm text-grayish-800">
            Each date keeps one total and one optional note. Set this day to what you remember.
          </div>
        </div>
        <div className="relative flex items-center justify-center py-2">
          <CircularSlider
            width={165}
            min={0}
            max={15}
            valueFontSize="2rem"
            label="minutes"
            labelColor="#FFFFFF"
            labelBottom={true}
            labelFontSize="1rem"
            knobColor="#1C1C1E"
            progressColorFrom="#B1D0E6"
            progressColorTo="#9CA3AF"
            progressSize={16}
            trackSize={16}
            trackColor="#F9FAFB"
            dataIndex={minutes}
            onChange={(value) => {
              setMinutes(value);
            }}
          />
          <div
            className={
              canSave && click
                ? "bg-bluish-500 absolute z-50 cursor-pointer rounded-full h-28 w-28"
                : "bg-grayish-600 absolute z-50 cursor-pointer rounded-full h-28 w-28"
            }
          >
            <button
              type="button"
              className="flex flex-col justify-center items-center h-28 w-28 cursor-pointer border-0 bg-transparent p-0 disabled:cursor-default"
              disabled={!canSave}
              onMouseDown={() => canSave && setClick(false)}
              onMouseUp={() => setClick(true)}
              onMouseLeave={() => setClick(true)}
              onClick={(e) => {
                e.stopPropagation();
                if (!canSave) {
                  return;
                }
                logEntry.mutateAsync({ minutes, reflection }).catch((err) => console.log(err));
              }}
            >
              <div className="text-white">{minutes}</div>
              <div className="text-center text-sm text-white">{buttonText}</div>
            </button>
          </div>
        </div>
        <div className="text-center text-sm text-grayish-800">
          {canSave ? "You have unsaved changes for this day." : "No changes to save."}
        </div>
        <label htmlFor="bored-reflection" className="flex flex-col gap-2 text-sm text-grayish-900">
          Note for this day <span className="text-grayish-800">Optional</span>
          <textarea
            id="bored-reflection"
            aria-label="Note for this day. Optional"
            className="min-h-20 rounded-xl border border-grayish-700 bg-white p-3 text-grayish-900"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What surfaced when you were bored?"
          />
        </label>
        <div className="text-xs text-grayish-800">
          Set minutes to 0 and clear the note to remove this day from the calendar.
        </div>
      </div>
    );
  };

  const SelectedDay = () => {
    const selectedMinutes = dataDate?.time ?? 0;
    return (
      <div className="px-4 py-4 rounded-2xl bg-grayish-500">
        <div className="font-bold">{date}</div>
        <div>{selectedMinutes} minutes of boredom remembered.</div>
        {dataDate?.reflection && (
          <div className="mt-2 rounded-xl bg-white p-3 text-sm text-grayish-900">
            {dataDate.reflection}
          </div>
        )}
        <Bullet
          data={[
            {
              id: "",
              ranges: [0, 60],
              measures: [selectedMinutes],
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
    const statistics =
      dataAll
        ?.toReversed()
        .map((x: LogEntry) => ({
          id: `${x.date}`,
          ranges: [1, 5, 20, 40, 60],
          measures: [x.time],
          markers: [5, 20],
        }))
        .slice(0, 7) || [];

    return (
      <details className="rounded-2xl bg-grayish-500 px-4 py-4">
        <summary className="cursor-pointer font-bold">Patterns</summary>
        <div className="text-sm text-grayish-800">A quiet look back — no scores, no streaks.</div>
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
      </details>
    );
  };

  return (
    <div className="flex flex-col gap-2 p-4 bg-white h-auto max-w-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold">Your bored moments</h1>
          <div className="text-sm text-grayish-800">
            Pick a date, then save what you remember from that day.
          </div>
        </div>
        <img src="/celendar.svg" alt="" />
      </div>
      {!loadingDate && (
        <Calendar
          onChange={(v) => v instanceof Date && onChange(v)}
          tileContent={({ date: tileDate, view }) => {
            const tileDayStart = new Date(tileDate);
            tileDayStart.setHours(0, 0, 0, 0);
            const log = loggedDays.get(tileDayStart.getTime());

            if (view !== "month" || log === undefined || log.time === 0) {
              return null;
            }

            return <span className="mx-auto mt-1 block h-1.5 w-1.5 rounded-full bg-bluish-500" />;
          }}
          value={value}
        />
      )}
      <SelectedDay />
      <div className="flex items-center justify-center">
        <LogMoment
          key={dayStartTime}
          initialMinutes={dataDate?.time ?? 0}
          initialReflection={dataDate?.reflection ?? ""}
        />
      </div>
      {!loadingDate && dataDate && <Statistic />}
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
