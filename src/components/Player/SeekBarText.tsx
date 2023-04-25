interface ISeekBarChapterText {
  text: string;
}
export function SeekBarChapterText(props: ISeekBarChapterText) {
  return (
    <span data-role="chapLabelTextHolder" class="hidden chapLabelTextHolder">
      {props.text}
    </span>
  );
}
