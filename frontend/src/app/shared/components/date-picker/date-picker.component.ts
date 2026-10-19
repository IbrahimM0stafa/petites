import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  forwardRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface CalendarDay {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  isPast: boolean;
  isBlocked: boolean;
  isDisabled: boolean;
  dayName: string;
}

export interface QuickDateOption {
  label: string;
  dateStr: string;
  displayFormatted: string;
}

@Component({
  selector: 'app-date-picker',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.css',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DatePickerComponent),
      multi: true
    }
  ]
})
export class DatePickerComponent implements OnInit, ControlValueAccessor {
  @Input() minDate = ''; // YYYY-MM-DD
  @Input() maxDate = ''; // YYYY-MM-DD
  @Input() blockedDays: string[] = [];
  @Input() placeholder = 'Select Baking & Delivery Date...';
  @Input() label = '';
  @Input() required = false;
  @Input() inline = false;
  @Input() disabled = false;
  @Input() error: string | null = null;
  @Input() hint = '';

  @Output() dateChange = new EventEmitter<string>();

  isOpen = false;
  value: string = ''; // YYYY-MM-DD
  viewDate: Date = new Date();

  readonly weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly daysOfWeekFull = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

  calendarGrid: CalendarDay[][] = [];
  quickOptions: QuickDateOption[] = [];

  private onChange: (val: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private readonly elementRef: ElementRef) {}

  ngOnInit(): void {
    this.initViewDate();
    this.generateCalendar();
    this.generateQuickOptions();
  }

  ngOnChanges(): void {
    this.generateCalendar();
    this.generateQuickOptions();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.inline) return;
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }

  // ControlValueAccessor methods
  writeValue(val: string | null): void {
    this.value = val || '';
    if (this.value) {
      const parts = this.value.split('-');
      if (parts.length === 3) {
        this.viewDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      }
    } else {
      this.initViewDate();
    }
    this.generateCalendar();
    this.generateQuickOptions();
  }

  registerOnChange(fn: (val: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  toggleOpen(): void {
    if (this.disabled || this.inline) return;
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.onTouched();
      this.initViewDate();
      this.generateCalendar();
    }
  }

  private initViewDate(): void {
    if (this.value) {
      const parts = this.value.split('-');
      if (parts.length === 3) {
        this.viewDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        return;
      }
    }
    if (this.minDate) {
      const parts = this.minDate.split('-');
      if (parts.length === 3) {
        this.viewDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
        return;
      }
    }
    this.viewDate = new Date();
  }

  get currentMonthYearLabel(): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric'
    }).format(this.viewDate);
  }

  get formattedSelectedDate(): string {
    if (!this.value) return '';
    const parts = this.value.split('-');
    if (parts.length !== 3) return this.value;
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    if (isNaN(date.getTime())) return this.value;

    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  get formattedBlockedDays(): string {
    if (!this.blockedDays || this.blockedDays.length === 0) return '';
    const names = this.blockedDays.map(d => {
      const lower = d.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1) + 's';
    });
    if (names.length === 1) return names[0];
    return names.slice(0, -1).join(', ') + ' & ' + names[names.length - 1];
  }

  get canGoPrev(): boolean {
    if (!this.minDate) return true;
    const parts = this.minDate.split('-');
    if (parts.length !== 3) return true;
    const minYear = parseInt(parts[0], 10);
    const minMonth = parseInt(parts[1], 10) - 1;

    const viewYear = this.viewDate.getFullYear();
    const viewMonth = this.viewDate.getMonth();

    if (viewYear < minYear) return false;
    if (viewYear === minYear && viewMonth <= minMonth) return false;
    return true;
  }

  prevMonth(): void {
    if (!this.canGoPrev) return;
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + 1, 1);
    this.generateCalendar();
  }

  selectDate(day: CalendarDay): void {
    if (day.isDisabled || this.disabled) return;
    this.value = day.dateStr;
    this.onChange(this.value);
    this.dateChange.emit(this.value);
    this.generateCalendar();
    this.generateQuickOptions();
    if (!this.inline) {
      this.isOpen = false;
    }
  }

  selectDateStr(dateStr: string): void {
    if (this.disabled) return;
    this.value = dateStr;
    this.onChange(this.value);
    this.dateChange.emit(this.value);
    this.generateCalendar();
    this.generateQuickOptions();
    if (!this.inline) {
      this.isOpen = false;
    }
  }

  clearDate(event: MouseEvent): void {
    event.stopPropagation();
    if (this.disabled) return;
    this.value = '';
    this.onChange('');
    this.dateChange.emit('');
    this.generateCalendar();
    this.generateQuickOptions();
  }

  isDayBlocked(date: Date): boolean {
    if (!this.blockedDays || this.blockedDays.length === 0) return false;
    const dayName = this.daysOfWeekFull[date.getDay()];
    return this.blockedDays.some(b => b.toUpperCase() === dayName);
  }

  private formatDateStr(year: number, month: number, day: number): string {
    const y = year.toString();
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private generateCalendar(): void {
    const year = this.viewDate.getFullYear();
    const month = this.viewDate.getMonth();

    const today = new Date();
    const todayStr = this.formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const flatDays: CalendarDay[] = [];

    // Leading padding days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const prevDateStr = this.formatDateStr(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      flatDays.push({
        date: prevDate,
        dateStr: prevDateStr,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: prevDateStr === todayStr,
        isSelected: prevDateStr === this.value,
        isPast: true,
        isBlocked: this.isDayBlocked(prevDate),
        isDisabled: true,
        dayName: this.daysOfWeekFull[prevDate.getDay()]
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = this.formatDateStr(year, month, day);
      const isPast = Boolean(this.minDate && dateStr < this.minDate);
      const isBlocked = this.isDayBlocked(date);
      const isDisabled = isPast || isBlocked;

      flatDays.push({
        date,
        dateStr,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === this.value,
        isPast,
        isBlocked,
        isDisabled,
        dayName: this.daysOfWeekFull[date.getDay()]
      });
    }

    // Trailing padding days to fill 7 columns per row (up to 35 or 42 cells)
    const remaining = (7 - (flatDays.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const nextDate = new Date(year, month + 1, i);
      const nextDateStr = this.formatDateStr(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      flatDays.push({
        date: nextDate,
        dateStr: nextDateStr,
        dayNumber: i,
        isCurrentMonth: false,
        isToday: nextDateStr === todayStr,
        isSelected: nextDateStr === this.value,
        isPast: false,
        isBlocked: this.isDayBlocked(nextDate),
        isDisabled: true,
        dayName: this.daysOfWeekFull[nextDate.getDay()]
      });
    }

    // Chunk into rows of 7
    this.calendarGrid = [];
    for (let i = 0; i < flatDays.length; i += 7) {
      this.calendarGrid.push(flatDays.slice(i, i + 7));
    }
  }

  private generateQuickOptions(): void {
    const options: QuickDateOption[] = [];
    const baseDate = this.minDate ? this.parseDate(this.minDate) : new Date();
    
    // Find next 3 available non-blocked dates starting from baseDate
    let current = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
    const today = new Date();
    const todayStr = this.formatDateStr(today.getFullYear(), today.getMonth(), today.getDate());

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.formatDateStr(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    let count = 0;
    let iterations = 0;

    while (count < 3 && iterations < 30) {
      const dateStr = this.formatDateStr(current.getFullYear(), current.getMonth(), current.getDate());
      const isPast = Boolean(this.minDate && dateStr < this.minDate);
      const isBlocked = this.isDayBlocked(current);

      if (!isPast && !isBlocked) {
        let label = '';
        if (dateStr === tomorrowStr) {
          label = '⚡ Tomorrow';
        } else if (count === 0) {
          label = '⚡ Earliest Available';
        } else {
          label = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(current);
        }

        const displayFormatted = new Intl.DateTimeFormat('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        }).format(current);

        options.push({
          label,
          dateStr,
          displayFormatted
        });
        count++;
      }

      current.setDate(current.getDate() + 1);
      iterations++;
    }

    this.quickOptions = options;
  }

  private parseDate(str: string): Date {
    const parts = str.split('-');
    if (parts.length === 3) {
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }
    return new Date();
  }
}
