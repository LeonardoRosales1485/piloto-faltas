import { NextResponse } from 'next/server';

export type HttpData<T> = {
  data: T;
  status: number;
  message: string | null;
};

export function ok<T>(data: T): HttpData<T> {
  return { data, status: 200, message: null };
}

export function fail(status: number, message: string): HttpData<null> {
  return { data: null, status, message };
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(ok(data), { status: 200, ...init });
}

export function jsonFail(status: number, message: string) {
  return NextResponse.json(fail(status, message), { status });
}
