import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  TabStopPosition,
  TabStopType,
  BorderStyle,
} from 'docx';
import { saveAs } from 'file-saver';
import type { NovelData } from '@/store/app-store';
import type { NovelExportData } from '@/lib/export-types';

export async function exportNovelToDocx(
  data: NovelExportData,
  novel: NovelData
) {
  const sections: Paragraph[] = [];

  // Title page
  sections.push(
    new Paragraph({
      spacing: { before: 2000 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: novel.title,
          bold: true,
          size: 40, // 20pt
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  // Blank line
  sections.push(new Paragraph({ spacing: { before: 400 }, children: [] }));

  // Metadata
  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `题材：${novel.genre}　　风格：${novel.style}`,
          size: 22,
          color: '666666',
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: `目标字数：${novel.targetWords.toLocaleString()} 字`,
          size: 22,
          color: '666666',
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [
        new TextRun({
          text: `创建时间：${novel.createdAt}`,
          size: 22,
          color: '666666',
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  // Divider line
  sections.push(new Paragraph({ spacing: { before: 600 }, children: [] }));

  sections.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
      },
      spacing: { after: 400 },
      children: [],
    })
  );

  // Steps section header
  sections.push(
    new Paragraph({
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: '【创作步骤】',
          bold: true,
          size: 28,
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  if (data.steps && data.steps.length > 0) {
    data.steps.forEach((step, idx) => {
      // Step heading
      sections.push(
        new Paragraph({
          spacing: { before: 300, after: 100 },
          children: [
            new TextRun({
              text: `第${idx + 1}步：${step.title || `步骤${step.stepNumber || idx + 1}`}`,
              bold: true,
              size: 24,
              font: 'Microsoft YaHei',
            }),
          ],
        })
      );

      // Step content
      const stepContent = step.content || '（无内容）';
      const paragraphs = stepContent.split('\n').filter((p) => p.trim());
      if (paragraphs.length > 0) {
        paragraphs.forEach((para) => {
          sections.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { firstLine: 480 },
              children: [
                new TextRun({
                  text: para,
                  size: 21,
                  font: 'Microsoft YaHei',
                }),
              ],
            })
          );
        });
      } else {
        sections.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: '（无内容）',
                size: 21,
                color: '999999',
                italics: true,
                font: 'Microsoft YaHei',
              }),
            ],
          })
        );
      }
    });
  } else {
    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: '（暂无创作步骤）',
            size: 21,
            color: '999999',
            italics: true,
            font: 'Microsoft YaHei',
          }),
        ],
      })
    );
  }

  // Chapters section header
  sections.push(new Paragraph({ spacing: { before: 600 }, children: [] }));

  sections.push(
    new Paragraph({
      spacing: { before: 200, after: 200 },
      children: [
        new TextRun({
          text: '【章节内容】',
          bold: true,
          size: 28,
          font: 'Microsoft YaHei',
        }),
      ],
    })
  );

  if (data.chapters && data.chapters.length > 0) {
    data.chapters.forEach((ch) => {
      // Chapter heading (H2)
      sections.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: `第${ch.number}章  ${ch.title}`,
              bold: true,
              size: 26,
              font: 'Microsoft YaHei',
            }),
          ],
        })
      );

      // Chapter content
      const chContent = ch.content || '（无内容）';
      const paragraphs = chContent.split('\n').filter((p) => p.trim());
      if (paragraphs.length > 0) {
        paragraphs.forEach((para) => {
          sections.push(
            new Paragraph({
              spacing: { before: 60, after: 60 },
              indent: { firstLine: 480 },
              children: [
                new TextRun({
                  text: para,
                  size: 21,
                  font: 'Microsoft YaHei',
                }),
              ],
            })
          );
        });
      } else {
        sections.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            children: [
              new TextRun({
                text: '（无内容）',
                size: 21,
                color: '999999',
                italics: true,
                font: 'Microsoft YaHei',
              }),
            ],
          })
        );
      }
    });
  } else {
    sections.push(
      new Paragraph({
        spacing: { before: 100, after: 100 },
        children: [
          new TextRun({
            text: '（暂无章节内容）',
            size: 21,
            color: '999999',
            italics: true,
            font: 'Microsoft YaHei',
          }),
        ],
      })
    );
  }

  // Create document
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Microsoft YaHei',
            size: 21,
          },
          paragraph: {
            spacing: { line: 360 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children: sections,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${novel.title}.docx`);
}
