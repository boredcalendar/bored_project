import CircularSlider from "@fseehawer/react-circular-slider";

const ButtonTimer = () => {
  return (
    <CircularSlider
      direction={-1}
      min={0}
      max={60}
      valueFontSize="4rem"
      label="You Bored?"
      labelColor="#1C1C1E"
      knobColor="#1C1C1E"
      progressColorFrom="#9CA3AF"
      progressColorTo="#B1D0E6"
      progressSize={16}
      trackColor="#39383B"
      dataIndex={1}
      onChange={(value: any) => {
        console.log(value);
      }}
    />
  );
};

export default ButtonTimer;
