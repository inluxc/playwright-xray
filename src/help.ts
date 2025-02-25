import type { TestStatus } from '@playwright/test/reporter';
import dayjs from 'dayjs';
import { XrayCloudStatus } from './types/cloud.types';
import { XrayServerStatus } from './types/server.types';

class Help {
  public jiraType = '';
  constructor(jiraType: string) {
    this.jiraType = jiraType;
  }

  convertPwStatusToXray(status: TestStatus): string {
    switch (this.jiraType) {
      case 'cloud':
        return XrayCloudStatus[status];
      case 'server':
        return XrayServerStatus[status];
      default:
        return '';
    }
  }

  getFormatData(date: Date) {
    if (this.jiraType === 'cloud') {
      return date.toISOString();
    }
    const d = dayjs(date);
    return d.format();
  }

  convertMsToTime(milliseconds: number) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);

    seconds = seconds % 60;
    minutes = minutes % 60;
    hours = hours % 24;

    let out = '';

    out += hours.toString() !== '0' ? `${hours.toString()}h ` : '';
    out += minutes.toString() !== '0' ? `${minutes.toString()}m ` : '';
    out += seconds.toString() !== '0' ? `${seconds.toString()}s ` : '';

    return out;
  }
}

export default Help;
