import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  PageBreak,
  Footer,
  Header,
  PageNumber,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import type { NovelData } from '@/store/app-store';
import type { NovelExportData } from '@/lib/export-types';

export async function exportNovelToDocxFormatted(data: NovelExportData, novel: NovelData) {
  const children: Paragraph[] = [];

  // Title page
  children.push(
    new Paragraph({
      spacing: { before: 3000 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: novel.title,
          bold: true,
          size: 48,
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );
  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }));
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `题材: ${novel.genre}  |  风格: ${novel.style}  |  目标字数: ${novel.targetWords.toLocaleString()}字`,
          size: 22,
          color: '666666',
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: `创建时间: ${novel.createdAt}`,
          size: 22,
          color: '888888',
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  // Divider
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
    spacing: { after: 400 },
    children: [],
  }));

  // Steps section
  children.push(
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: '【创作步骤】',
          bold: true,
          size: 32,
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  if (data.steps && data.steps.length > 0) {
    data.steps.forEach((step, idx) => {
      children.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [
            new TextRun({
              text: `${idx + 1}. ${step.title || `步骤${step.stepNumber || idx + 1}`}`,
              bold: true,
              size: 28,
              font: 'Microsoft YaHei',
            }),
          ],
        })
      );
      const content = step.content || '（无内容）';
      const paragraphs = content.split('\n').filter((p) => p.trim());
      if (paragraphs.length > 0) {
        paragraphs.forEach((para) => {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { firstLine: 480 },
              children: [new TextRun({ text: para, size: 21, font: 'Microsoft YaHei' })],
            })
          );
        });
      }
    });
  } else {
    children.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ text: '（暂无创作步骤）', size: 21, color: '999999', italics: true, font: 'Microsoft YaHei' })],
      })
    );
  }

  // Chapters section
  children.push(new Paragraph({ spacing: { before: 600 }, children: [] }));
  children.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({ text: '【章节内容】', bold: true, size: 32, font: 'Microsoft YaHei' }),
      ],
    })
  );

  if (data.chapters && data.chapters.length > 0) {
    data.chapters.forEach((ch) => {
      children.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          pageBreakBefore: ch.number > 1,
          children: [
            new TextRun({
              text: `第${ch.number}章  ${ch.title}`,
              bold: true,
              size: 28,
              font: 'Microsoft YaHei',
            }),
          ],
        })
      );
      const content = ch.content || '（无内容）';
      const paragraphs = content.split('\n').filter((p) => p.trim());
      if (paragraphs.length > 0) {
        paragraphs.forEach((para) => {
          children.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { firstLine: 480 },
              children: [new TextRun({ text: para, size: 21, font: 'Microsoft YaHei' })],
            })
          );
        });
      }
    });
  } else {
    children.push(
      new Paragraph({
        spacing: { before: 100 },
        children: [new TextRun({ text: '（暂无章节内容）', size: 21, color: '999999', italics: true, font: 'Microsoft YaHei' })],
      })
    );
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Microsoft YaHei', size: 21 },
          paragraph: { spacing: { line: 360 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                  children: [PageNumber.CURRENT],
                  size: 18,
                  color: '888888',
                  font: 'Microsoft YaHei',
                }),
                ],
              }),
            ],
          }),
          first: new Header({
            children: [new Paragraph({ children: [] })],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: `${novel.title} - 笔境 AI`,
                    size: 16,
                    color: 'AAAAAA',
                    font: 'Microsoft YaHei',
                  }),
                ],
              }),
            ],
          }),
          first: new Footer({ children: [new Paragraph({ children: [] })] }),
        },
        children,
      },
    ],
  });

  const blob = await (await import('docx')).Packer.toBlob(doc);
  saveAs(blob, `${novel.title}.docx`);
}
