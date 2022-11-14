import CircularSlider from "@fseehawer/react-circular-slider";
import React from "react";

const ButtonTimer: React.FC<{}> = () => {
  const [minuts, setMinuts] = React.useState(0);
  const date = new Date().toISOString().split("T")[0];
  const [click, setClick] = React.useState(true);
  const dataBase = { date: date, time: 0 };

  if (localStorage.length === 0)
    localStorage.setItem("DataBase", JSON.stringify(dataBase));
  const raw = localStorage.getItem("DataBase");
  const upDateDataBase = JSON.parse(raw!);
  return (
    <>
      <CircularSlider
        width={165}
        direction={-1}
        min={0}
        max={60}
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
        dataIndex={1}
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
          onClick={() => {
            upDateDataBase.time = upDateDataBase.time + minuts;
            localStorage.setItem("DataBase", JSON.stringify(upDateDataBase));
          }}
        >
          <div className="text-white">{minuts}</div>
          <div className="text-white">You Bored?</div>
        </div>
      </div>
    </>
  );
};

export default ButtonTimer;
