export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export function ok<T>(data: T, msg = 'success'): ApiResponse<T> {
  return {
    code: 200,
    msg,
    data,
  };
}
