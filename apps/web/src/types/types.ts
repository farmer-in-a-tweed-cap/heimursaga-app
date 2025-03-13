import { NextPage } from 'next';
import { AppProps } from 'next/app';
import { ReactElement, ReactNode } from 'react';

export type AppPropsWithLayout<T> = AppProps & {
  Component: NextPageWithLayout<T>;
};

type NextPageWithLayout<T> = NextPage & {
  getLayout?: (page: ReactElement, props: T) => ReactNode;
  getProviders?: (page: ReactElement, props: T) => ReactNode;
};

type NextPageWithProviders<T> = NextPage & {
  getProviders?: (page: ReactElement, props: T) => ReactNode;
};

export type PageWithLayout<T> = React.FC<T> &
  NextPageWithLayout<T> &
  NextPageWithProviders<T>;

export type PageWithProviders<T> = React.FC<T> & NextPageWithProviders<T>;
