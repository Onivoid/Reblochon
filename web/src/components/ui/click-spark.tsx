"use client";
import * as React from "react";
import { ReferenceField, type ReferenceFieldProps } from "@/lib/cojeev/reference-field";
export type ClickSparkProps = ReferenceFieldProps;
/** Finite radial accents respond to pointer or keyboard activation. */
export function ClickSpark(props: ClickSparkProps) {
  return <ReferenceField {...props} kind="click-spark" />;
}
