import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import { Alert, Autocomplete, Button, Popover, Stack, TextField, Typography } from '@mui/material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import dayjs from 'dayjs';
import { useMemo, useState } from 'react';
import { describeError } from '../../api/client';
import { useFacilityAvailability, useFacilityPeriodAvailability } from '../../api/facilityAvailability';
import { fromNowLocalInput, validateLocalInterval } from '../../utils/dateTime';
import {
  calendarDayBounds,
  calendarMonth,
  calendarMonthBounds,
  canEndAt,
  canStartAt,
  dayHasAvailableEnd,
  dayHasAvailableStart,
  findEndLimit,
  timeOptions,
} from './facilityEventScheduleDates';

type Scope = { organizationId: number; facilityId: number; timeZone: string };
type Schedule = { startsAt: string; endsAt: string };
type ScheduleProps = Scope & Schedule & { onChange: (value: Schedule) => void };

function useCalendarAvailability(scope: Scope, month: string, startInstant?: string) {
  const { organizationId, facilityId, timeZone } = scope;
  const bounds = useMemo(() => month ? calendarMonthBounds(month, timeZone) : undefined, [month, timeZone]);
  const timeline = useFacilityAvailability(organizationId, facilityId, bounds?.startsAt, bounds?.endsAt, true);
  const needsPrefix = Boolean(startInstant && bounds && Date.parse(startInstant) < Date.parse(bounds.startsAt));
  // Um mês sem bloqueios não garante que o intervalo desde o começo esteja livre.
  const prefix = useFacilityAvailability(organizationId, facilityId, needsPrefix ? startInstant : undefined,
    needsPrefix ? bounds?.startsAt : undefined);
  const ready = timeline.isSuccess && (!needsPrefix || prefix.isSuccess);
  const segments = ready ? timeline.data.segments : undefined;
  const limit = ready && bounds && startInstant && (!needsPrefix || (prefix.data?.availableCapacity ?? 0) > 0)
    ? findEndLimit(bounds, timeline.data.segments, startInstant) : Number.NEGATIVE_INFINITY;
  return {
    ready, segments, limit,
    pending: !ready && (timeline.isFetching || (needsPrefix && prefix.isFetching)),
    error: timeline.error ?? (needsPrefix ? prefix.error : null),
    retry: () => { void timeline.refetch(); if (needsPrefix) void prefix.refetch(); },
  };
}

interface SlotPickerProps {
  scope: Scope;
  point: 'Início' | 'Fim';
  day: string;
  time: string;
  startInstant?: string;
  startDay?: string;
  disabled?: boolean;
  onDayChange: (day: string) => void;
  onTimeChange: (time: string) => void;
}

function SlotPicker({ scope, point, day, time, startInstant, startDay, disabled, onDayChange, onTimeChange }: SlotPickerProps) {
  const { timeZone } = scope;
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [visibleMonth, setVisibleMonth] = useState('');
  const selectedMonth = day ? calendarMonth(day) : '';
  const calendar = useCalendarAvailability(scope, anchor ? visibleMonth : '', startInstant);
  const slots = useCalendarAvailability(scope, selectedMonth, startInstant);
  const title = point === 'Início' ? 'início' : 'fim';
  const dateLabel = `Data de ${title}`;
  const timeLabel = `Horário de ${title}`;
  const asDay = (value: string) => dayjs(`${value}T12:00`);
  const isAnyAvailable = (selectedDay: string) => {
    if (!calendar.segments || calendarMonth(selectedDay) !== visibleMonth) return false;
    const bounds = calendarDayBounds(selectedDay, timeZone);
    return startInstant ? dayHasAvailableEnd(bounds, startInstant, calendar.limit)
      : dayHasAvailableStart(bounds, calendar.segments);
  };
  const allowsTime = (option: string) => {
    if (!slots.segments) return false;
    return startInstant ? canEndAt(day, option, timeZone, startInstant, slots.limit)
      : canStartAt(day, option, timeZone, slots.segments);
  };
  const options = useMemo(() => timeOptions(day, timeZone, slots.segments ?? [], '',
    startInstant ? [new Date(Date.parse(startInstant) + 60_000).toISOString()] : []),
    [day, timeZone, slots.segments, startInstant]);
  return (
    <Stack spacing={1} sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="subtitle2">{point}</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
        <Button variant="outlined" startIcon={<CalendarMonthOutlined />} sx={{ flex: 1, minHeight: 40 }}
          aria-label={dateLabel} aria-haspopup="dialog" aria-expanded={Boolean(anchor)} disabled={disabled}
          onClick={(event) => {
            const defaultDay = day || startDay || fromNowLocalInput(0, timeZone).slice(0, 10);
            setVisibleMonth(calendarMonth(defaultDay));
            setAnchor(event.currentTarget);
          }}>
          {day ? asDay(day).format('DD/MM/YYYY') : dateLabel}
        </Button>
        <Popover open={Boolean(anchor)} anchorEl={anchor} onClose={() => setAnchor(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          slotProps={{ paper: { role: 'dialog', 'aria-label': dateLabel } }}>
          <DateCalendar views={['day']} openTo="day" value={day ? asDay(day) : null}
            reduceAnimations
            referenceDate={visibleMonth ? asDay(visibleMonth) : undefined}
            minDate={startDay ? asDay(startDay) : undefined}
            onMonthChange={(month) => setVisibleMonth(calendarMonth(month.format('YYYY-MM-DD')))}
            shouldDisableDate={(candidate) => !isAnyAvailable(candidate.format('YYYY-MM-DD'))}
            loading={!calendar.ready}
            renderLoading={() => calendar.error ? (
              <Stack spacing={1} alignItems="center" sx={{ px: 2 }}>
                <Typography variant="body2" role="alert">{describeError(calendar.error)}</Typography>
                <Button onClick={calendar.retry}>Tentar novamente</Button>
              </Stack>
            ) : <Typography role="status" variant="body2">Consultando disponibilidade…</Typography>}
            onChange={(newDate) => {
              if (!newDate?.isValid()) return;
              const selectedDay = newDate.format('YYYY-MM-DD');
              if (!isAnyAvailable(selectedDay)) return;
              onDayChange(selectedDay);
              setAnchor(null);
            }}
          />
        </Popover>
        <Autocomplete
          sx={{ flex: 1, minWidth: { sm: 145 } }}
          size="small"
          autoHighlight
          openOnFocus
          disabled={disabled || !day || !slots.ready}
          options={options}
          value={time || null}
          filterOptions={(_options, { inputValue }) => inputValue === time
            ? options : inputValue ? timeOptions(day, timeZone, [], inputValue.trim()).slice(0, 96) : options}
          getOptionDisabled={(option) => !allowsTime(option)}
          onChange={(_event, selected) => { if (!selected || allowsTime(selected)) onTimeChange(selected ?? ''); }}
          noOptionsText="Nenhum horário encontrado"
          renderInput={(params) => <TextField {...params} label={timeLabel} />}
        />
      </Stack>
      {day && slots.pending && <Typography variant="caption" role="status">Consultando horários…</Typography>}
      {day && slots.error && <Alert severity="warning"
        action={<Button onClick={slots.retry}>Tentar novamente</Button>}>{describeError(slots.error)}</Alert>}
    </Stack>
  );
}

function ScheduleFields({ organizationId, facilityId, timeZone, startsAt, endsAt, onChange }: ScheduleProps) {
  const [draftStartDay, setDraftStartDay] = useState('');
  const [draftEndDay, setDraftEndDay] = useState('');
  const startDay = startsAt.slice(0, 10) || draftStartDay;
  const endDay = endsAt.slice(0, 10) || draftEndDay;
  const { startsAt: startInstant } = validateLocalInterval(startsAt, endsAt, timeZone);
  const period = useFacilityPeriodAvailability(organizationId, facilityId, startsAt, endsAt, timeZone);
  const scope = { organizationId, facilityId, timeZone };
  const capacity = period.data?.availableCapacity ?? 0;

  const changeStart = (newStartsAt: string) => {
    if (newStartsAt === startsAt) return;
    setDraftEndDay('');
    onChange({ startsAt: newStartsAt, endsAt: '' });
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <SlotPicker point="Início" scope={scope} day={startDay} time={startsAt.slice(11)}
          onDayChange={(day) => { setDraftStartDay(day); if (day !== startDay) changeStart(''); }}
          onTimeChange={(time) => { setDraftStartDay(startDay); changeStart(time ? `${startDay}T${time}` : ''); }}
        />
        <SlotPicker point="Fim" scope={scope} day={endDay} time={endsAt.slice(11)} startDay={startDay}
          startInstant={startInstant} disabled={!startInstant}
          onDayChange={(day) => { setDraftEndDay(day); if (day !== endDay) onChange({ startsAt, endsAt: '' }); }}
          onTimeChange={(time) => { setDraftEndDay(endDay); onChange({ startsAt, endsAt: time ? `${endDay}T${time}` : '' }); }}
        />
      </Stack>
      {startsAt && endsAt && period.isFetching
        ? <Typography variant="body2" role="status">Conferindo vagas no período…</Typography>
        : period.isError
          ? <Alert severity="warning" action={<Button onClick={() => void period.refetch()}>Tentar novamente</Button>}>
            Não foi possível consultar as vagas no período. {describeError(period.error)}
          </Alert>
          : period.isSuccess
            ? <Alert severity={capacity > 0 ? 'success' : 'warning'}>
              {capacity === 1 ? '1 vaga disponível durante todo o período.'
                : capacity > 1 ? `${capacity} vagas disponíveis durante todo o período.`
                  : 'Não há vagas disponíveis durante todo o período. Escolha outros horários.'}
            </Alert>
            : <Typography variant="body2" color="text.secondary">
              Dias e horários sem vagas ficam desabilitados. Para outro minuto livre, digite no campo de horário.
            </Typography>}
    </Stack>
  );
}

export function FacilityEventSchedule(props: ScheduleProps) {
  return <ScheduleFields key={`${props.organizationId}-${props.facilityId}-${props.timeZone}`} {...props} />;
}
