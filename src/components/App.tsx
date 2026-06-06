import React from "react";
import Calendar from "react-calendar";
import * as CircularSliderModule from "@fseehawer/react-circular-slider";
import { Bullet } from "@nivo/bullet";
import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { validateStoredLogEntries, validateStoredLogEntry, type LogEntry } from "./logEntry";
import { ImportError, planExport, planImport, serializeExport } from "../lib/dataPortability";
import {
  getPersistentStorageStatus,
  requestPersistentStorage,
  type PersistentStorageStatus,
} from "../lib/persistentStorage";

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
const maxDialMinutes = 20;
const circularSliderMax = maxDialMinutes + 1;
const maxDailyMinutes = 240;

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
      const upload = validateStoredLogEntry(
        await indexedDb.getValue("Logs", dayStartTime),
        "Logs.getValue",
      );
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
      return validateStoredLogEntries(await indexedDb.getAllValue("Logs"), "Logs.getAllValue");
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
    const statusText = canSave
      ? `${minutes} minutes, unsaved changes.`
      : `${minutes} minutes saved for this day.`;
    const addTenMinutes = () => {
      setMinutes((currentMinutes) => Math.min(currentMinutes + 10, maxDailyMinutes));
    };

    return (
      <div className="flex flex-col gap-3 rounded-2xl bg-bluish-100 px-4 py-4">
        <div>
          <div className="font-bold">Remember this day</div>
          <div className="text-sm text-grayish-800">
            Each date keeps one total and one optional note. Set this day to what you remember.
          </div>
        </div>
        <div className="relative flex items-center justify-center py-2">
          <div className="relative z-0 flex items-center justify-center">
            <CircularSlider
              width={165}
              min={0}
              max={circularSliderMax}
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
              dataIndex={Math.min(minutes, maxDialMinutes)}
              onChange={(value) => {
                setMinutes(value);
              }}
            />
            <div
              className={
                canSave && click
                  ? "bg-bluish-500 absolute z-10 cursor-pointer rounded-full h-28 w-28"
                  : "bg-grayish-600 absolute z-10 cursor-pointer rounded-full h-28 w-28"
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
          <div className="absolute right-0 top-4 flex w-14 flex-col items-stretch gap-20">
            <button
              type="button"
              className="rounded-2xl border border-bluish-500 bg-white px-1.5 py-2 text-sm font-bold text-grayish-900 disabled:cursor-default disabled:border-grayish-600 disabled:text-grayish-800"
              disabled={minutes >= maxDailyMinutes}
              onClick={() => {
                addTenMinutes();
              }}
            >
              +10
            </button>
            <button
              type="button"
              className="rounded-full px-1 py-0.5 text-xs font-bold text-grayish-800 underline decoration-grayish-700 underline-offset-2"
              onClick={() => setMinutes(0)}
            >
              Clear
            </button>
          </div>
        </div>
        <div className="text-center text-sm text-grayish-800">{statusText}</div>
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
      <DataControls
        days={dataAll}
        onImported={async () => {
          await refetch();
          await queryClient.invalidateQueries({ queryKey: ["logs"] });
        }}
      />
    </div>
  );
};

const DataControls: React.FC<{
  days: LogEntry[] | undefined;
  onImported: () => Promise<void>;
}> = ({ days, onImported }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | undefined>(
    undefined,
  );
  const [storageStatus, setStorageStatus] = React.useState<PersistentStorageStatus>("unsupported");

  React.useEffect(() => {
    let active = true;
    getPersistentStorageStatus()
      .then((status) => active && setStorageStatus(status))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const handleExport = () => {
    // Refuse to export when the store hasn't loaded, so a failed read can't be
    // saved as a misleading empty backup.
    const plan = planExport(days);
    if (!plan.ok) {
      setMessage({ tone: "error", text: plan.reason });
      return;
    }
    const now = new Date();
    const json = serializeExport(plan.days, now.toISOString());
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `bored-calendar-${now.toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    // Defer revocation so the download has begun across browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0);
    setMessage({ tone: "ok", text: `Exported ${plan.days.length} day(s).` });
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so importing the same file twice still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }
    try {
      const indexedDb = new IndexedDb("Calendar");
      await indexedDb.createObjectStore(["Logs"]);
      // Validate the file and merge it with existing days before any write, so a
      // bad import never mutates storage and never deletes days absent from the
      // file (merge is an upsert; imported days win on id collision).
      const { merged, imported } = planImport(
        await indexedDb.getAllValue("Logs"),
        await file.text(),
      );
      await indexedDb.putBulkValue("Logs", merged);
      await onImported();
      setMessage({ tone: "ok", text: `Imported ${imported.length} day(s).` });
    } catch (error) {
      const text =
        error instanceof ImportError
          ? error.message
          : "Something went wrong reading that file, so nothing was changed.";
      setMessage({ tone: "error", text });
    }
  };

  const handlePersist = async () => {
    setStorageStatus(await requestPersistentStorage());
  };

  const storageLabel: Record<PersistentStorageStatus, string> = {
    granted: "On — this browser has agreed to keep your data.",
    denied: "Not yet granted — your browser may clear data under storage pressure.",
    unsupported: "Not available in this browser.",
  };

  return (
    <details className="rounded-2xl bg-grayish-500 px-4 py-4">
      <summary className="cursor-pointer font-bold">Backup &amp; restore</summary>
      <div className="text-sm text-grayish-800">
        Your days live only on this device. Export a copy to keep them safe, or import a copy onto
        another device. No account needed.
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-2xl border border-bluish-500 bg-white px-3 py-2 text-sm font-bold text-grayish-900"
          onClick={handleExport}
        >
          Export JSON
        </button>
        <button
          type="button"
          className="rounded-2xl border border-bluish-500 bg-white px-3 py-2 text-sm font-bold text-grayish-900"
          onClick={() => fileInputRef.current?.click()}
        >
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          aria-label="Import a Bored Calendar JSON export"
          onChange={(event) => {
            handleImport(event).catch(() => undefined);
          }}
        />
      </div>
      {message && (
        <output
          className={
            message.tone === "ok"
              ? "mt-3 block rounded-xl bg-white p-3 text-sm text-grayish-900"
              : "mt-3 block rounded-xl bg-white p-3 text-sm text-red-700"
          }
        >
          {message.text}
        </output>
      )}
      <div className="mt-4 border-t border-grayish-600 pt-3">
        <div className="text-sm font-bold text-grayish-900">Persistent storage</div>
        <div className="text-sm text-grayish-800">{storageLabel[storageStatus]}</div>
        {storageStatus !== "granted" && storageStatus !== "unsupported" && (
          <button
            type="button"
            className="mt-2 rounded-2xl border border-bluish-500 bg-white px-3 py-2 text-sm font-bold text-grayish-900"
            onClick={() => {
              handlePersist().catch(() => undefined);
            }}
          >
            Keep my data on this device
          </button>
        )}
      </div>
    </details>
  );
};

export default () => {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
};
