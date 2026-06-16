// PolarLearn: A free and open-source learning platform.
// Copyright(C) 2024-2026 PolarNL Group
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation, either version 3 of the
// License, or (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import { useRouteLoaderData } from "react-router";
import i18n from "~/i18n";
import type { LoaderData } from "~/lib/viewlist";

export default function WordsPage() {
  const t = i18n.t
  const { list } = useRouteLoaderData<LoaderData>("../routes/app/viewlist/layout") ?? { list: { items: [] } };

  return (
    <div className="mt-8">
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900/80 shadow-[0_0_0_1px_rgba(0,0,0,0.05)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="bg-neutral-50 text-sm font-semibold text-neutral-900 dark:bg-white/5 dark:text-neutral-200">
              <th className="w-1/2 px-8 py-4">{t("lists.create.keyInputPlaceholder")}</th>
              <th className="w-1/2 px-8 py-4">{t("lists.create.valueInputPlaceholder")}</th>
            </tr>
          </thead>
          <tbody>
            {list.items.length > 0 ? (
              list.items.map((item: { id: string; question: string; answer: string }) => (
                <tr
                  key={item.id}
                  className="border-t border-neutral-200 text-[15px] leading-6 text-neutral-900 even:bg-neutral-50 odd:bg-transparent dark:border-neutral-800/80 dark:text-neutral-100 dark:even:bg-white/5 dark:odd:bg-transparent"
                >
                  <td className="px-8 py-4 align-middle font-medium text-neutral-900 dark:text-neutral-100">
                    <span className="block truncate">{item.question}</span>
                  </td>
                  <td className="px-8 py-4 align-middle text-neutral-700 dark:text-neutral-300">
                    <span className="block truncate">{item.answer}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-neutral-200 dark:border-neutral-800/80">
                <td className="px-8 py-10 text-sm text-neutral-500 dark:text-neutral-400" colSpan={2}>
                  Nog geen woorden toegevoegd.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}