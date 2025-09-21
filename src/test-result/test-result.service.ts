import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTestResultDto } from './dto/create-test-result.dto';
import { UpdateTestResultDto } from './dto/update-test-result.dto';
import { FilterTestResultDto } from './dto/filter-test-result.dto';
import { NotificationType } from '@prisma/client';
import * as XLSX from 'xlsx';

@Injectable()
export class TestResultService {
    constructor(private readonly prisma: PrismaService) {}

    async create(dto: CreateTestResultDto) {
        const { testId, results } = dto;
    
        const test = await this.prisma.test.findUnique({ where: { id: testId } });
        if (!test) throw new BadRequestException(`Test with ID ${testId} not found`);
    
        const studentIds = results.map(r => r.studentId);
    
        const students = await this.prisma.student.findMany({
            where: { id: { in: studentIds } },
        });
    
        const foundStudentIds = new Set(students.map(s => s.id));
        const missingStudents = studentIds.filter(id => !foundStudentIds.has(id));
        if (missingStudents.length) {
            throw new BadRequestException(`Students not found: ${missingStudents.join(', ')}`);
        }
    
        // Check for existing results
        const existingResults = await this.prisma.testResult.findMany({
            where: {
                testId,
                studentId: { in: studentIds },
            },
        });
    
        const existingStudentIds = new Set(existingResults.map(r => r.studentId));
        const newResults = results.filter(r => !existingStudentIds.has(r.studentId));
        
        console.log(`Found ${existingResults.length} existing results, creating ${newResults.length} new results`);
        
        if (existingResults.length > 0) {
            const existingIds = existingResults.map(r => r.studentId);
            console.log(`Skipping existing results for studentIds: ${existingIds.join(', ')}`);
        }
    
        let createdResults = { count: 0 };
        if (newResults.length > 0) {
            // Create only new test results
            createdResults = await this.prisma.testResult.createMany({
                data: newResults.map(r => ({
                    studentId: r.studentId,
                    testId,
                    correctAnswers: r.correctAnswers,
                })),
            });
        }
    
                // Fetch all parents of students with student data
        const parents = await this.prisma.parent.findMany({
            where: { studentId: { in: studentIds } },
            include: { student: true }
        });

        console.log(`Found ${parents.length} parents for ${studentIds.length} students`);
        parents.forEach((parent, index) => {
            console.log(`Parent ${index + 1}: ID=${parent.id}, TelegramID=${parent.telegramId}, Student=${parent.student.firstName} ${parent.student.lastName}`);
        });

        if (!parents.length) {
            throw new BadRequestException('No parents found for these students');
        }

        const reminderText = await this.prisma.config.findFirst({
            where: {
                key: NotificationType.TEST_RESULT_REMINDER
            }
        });

        console.log(`Config for TEST_RESULT_REMINDER: ${reminderText ? 'Found' : 'Not found'}`);
        if (reminderText) {
            console.log(`Template length: ${reminderText.value.length}`);
        }

        const messageTemplate = reminderText?.value || `📊 <b> Test natijasi </b>:

<b>Nomi:</b> %t
<b>O'quvchi:</b> %n
<b>Sana:</b> %d
<b>Savollar soni:</b> %g ta
<b>To'g'ri javoblar:</b> %s ta

<b>Hurmatli ota-ona!</b>
Bu test natijalari o'quv jarayonining bir qismi bo'lib, farzandingizning kuchli va rivojlantirish kerak bo'lgan tomonlarini ko'rsatib beradi. Har bir natija – bu o'sish imkoniyati. Iltimos, ushbu natijalar bilan yaqindan tanishib chiqing va farzandingizning bilimini yanada oshirishda biz bilan hamkorlikda ishlang.`;

        // Only send notifications for newly created results
        const notifications = parents
            .filter(parent => newResults.some(r => r.studentId === parent.studentId))
            .map(parent => {
                const result = newResults.find(r => r.studentId === parent.studentId);
                const student = parent.student;
                
                const formattedDate = test.date.toLocaleDateString('uz-UZ', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                
                return {
                    type: NotificationType.TEST_RESULT_REMINDER,
                    telegramId: parent.telegramId,
                    message: messageTemplate
                        .replace('%t', test.title)
                        .replace('%n', student.firstName + ' ' + student.lastName)
                        .replace('%d', formattedDate)
                        .replace('%g', test.totalQuestions.toString())
                        .replace('%s', result?.correctAnswers.toString() || '0'),
                };
            });
    
        // Add logging to debug notification creation
        console.log(`Creating ${notifications.length} test result notifications`);
        notifications.forEach((notif, index) => {
            console.log(`Notification ${index + 1}: Type=${notif.type}, TelegramID=${notif.telegramId}, Message length=${notif.message.length}`);
        });
    
        try {
            await this.prisma.notification.createMany({ data: notifications });
            console.log(`Successfully created ${notifications.length} test result notifications`);
        } catch (error) {
            console.error('Error creating test result notifications:', error);
            throw new BadRequestException(`Failed to create notifications: ${error.message}`);
        }
    
        return { 
            message: `Test results processed successfully. Created: ${createdResults.count}, Skipped: ${existingResults.length}`, 
            created: createdResults.count,
            skipped: existingResults.length,
            total: results.length
        };
    }
    

    async findAll(filter: FilterTestResultDto) {
        const { page, limit, testId, studentId } = filter;

        const where: any = {};
        if (testId) where.testId = testId;
        if (studentId) where.studentId = studentId;

        const total = await this.prisma.testResult.count({ where });

        const results = await this.prisma.testResult.findMany({
            where,
            skip: (page - 1) * limit,
            take: limit,
            include: { test: true, student: true },
            orderBy: { createdAt: 'desc' },
        });

        return {
            data: results,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const result = await this.prisma.testResult.findUnique({
            where: { id },
            include: { test: true, student: true },
        });

        if (!result) throw new BadRequestException(`TestResult with ID ${id} not found`);
        return { data: result };
    }

    async update(id: number, dto: UpdateTestResultDto) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        const updated = await this.prisma.testResult.update({ where: { id }, data: dto });
        return { data: updated };
    }

    async remove(id: number) {
        const exists = await this.prisma.testResult.findUnique({ where: { id } });
        if (!exists) throw new BadRequestException(`TestResult with ID ${id} not found`);

        await this.prisma.testResult.delete({ where: { id } });
        return { message: 'Deleted successfully' };
    }

    async generateExcelReport(testId: number, telegramId?: string) {
        // Get test information
        const test = await this.prisma.test.findUnique({
            where: { id: testId },
            include: { group: true }
        });
        
        if (!test) {
            throw new BadRequestException(`Test with ID ${testId} not found`);
        }

        // Get all test results for this test with student information
        const testResults = await this.prisma.testResult.findMany({
            where: { testId },
            include: {
                student: {
                    select: {
                        firstName: true,
                        lastName: true
                    }
                }
            },
            orderBy: {
                correctAnswers: 'desc'
            }
        });

        if (testResults.length === 0) {
            throw new BadRequestException(`No test results found for test ID ${testId}`);
        }

        // Prepare data for Excel
        const excelData = [
            ['Ism-Familiya', 'Test natijasi'], // Header row
            ...testResults.map(result => [
                `${result.student.firstName} ${result.student.lastName}`,
                `${result.correctAnswers}/${test.totalQuestions}`
            ])
        ];

        // Create workbook and worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.aoa_to_sheet(excelData);

        // Style the header row (make it bold and center)
        const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
        for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            if (!worksheet[cellAddress]) continue;
            
            worksheet[cellAddress].s = {
                font: { bold: true },
                alignment: { horizontal: 'center', vertical: 'center' }
            };
        }

        // Style all data cells (center alignment)
        const dataRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:B1');
        for (let row = 1; row <= dataRange.e.r; row++) {
            for (let col = dataRange.s.c; col <= dataRange.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                if (!worksheet[cellAddress]) continue;
                
                worksheet[cellAddress].s = {
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }
        }

        // Set column widths
        worksheet['!cols'] = [
            { wch: 25 }, // Ism-Familiya column
            { wch: 15 }  // Test natijasi column
        ];

        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Test Natijalari');

        // Generate Excel buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const result = {
            buffer: excelBuffer,
            filename: `test_${testId}_natijalari.xlsx`,
            testTitle: test.title,
            totalStudents: testResults.length
        };

        // Send via Telegram if telegramId is provided, otherwise return buffer for download
        if (telegramId) {
            try {
                const { sendExcelFile } = await import('../bot');
                const caption = `📊 <b>${test.title}</b> test natijalari\n\n` +
                              `📈 Jami o'quvchilar: ${testResults.length} ta\n` +
                              `📅 Sana: ${test.date.toLocaleDateString('uz-UZ')}\n` +
                              `📝 Savollar soni: ${test.totalQuestions} ta\n\n` +
                              `Natijalar eng yuqori ballardan eng past ballarga qarab tartiblangan.`;
                
                await sendExcelFile({
                    buffer: excelBuffer,
                    filename: result.filename,
                    chatId: telegramId,
                    caption: caption
                });
                
                console.log(`Excel file sent successfully to telegram ID: ${telegramId}`);
                
                return {
                    message: 'Excel file sent successfully via Telegram',
                    testTitle: test.title,
                    totalStudents: testResults.length,
                    telegramId: telegramId
                };
            } catch (error) {
                console.error('Error sending Excel file via Telegram:', error);
                throw new BadRequestException(`Failed to send Excel file via Telegram: ${error.message}`);
            }
        }

        // Return buffer for download if no telegramId provided
        return result;
    }
}